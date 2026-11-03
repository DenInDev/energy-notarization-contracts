"""Persistent, locally keyed PVAC worker; emits public fixtures/results only."""
import base64
import ctypes as c
import hashlib
import json
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / 'logs/octra-pilot/vendor/webcli/pvac/build/libpvac.so'
P = 2**127 - 1


def main():
    lib = c.CDLL(str(LIB))
    ptr, u64, size = c.c_void_p, c.c_uint64, c.c_size_t
    signatures = {
        'pvac_default_params': (ptr, []),
        'pvac_keygen_from_seed': (None, [ptr, ptr, c.POINTER(ptr), c.POINTER(ptr)]),
        'pvac_enc_value_seeded': (ptr, [ptr, ptr, u64, ptr]),
        'pvac_dec_value_fp': (None, [ptr, ptr, ptr, c.POINTER(u64), c.POINTER(u64)]),
        'pvac_ct_add': (ptr, [ptr, ptr, ptr]),
        'pvac_ct_scale': (ptr, [ptr, ptr, c.c_int64]),
        'pvac_ct_div_const': (ptr, [ptr, ptr, u64, u64]),
        'pvac_serialize_cipher_public': (ptr, [ptr, c.POINTER(size)]),
        'pvac_serialize_pubkey': (ptr, [ptr, c.POINTER(size)]),
        'pvac_deserialize_cipher': (ptr, [ptr, size]),
    }
    for name in ('params', 'pubkey', 'seckey', 'cipher', 'bytes'):
        signatures['pvac_free_' + name] = (None, [ptr])
    for name, (restype, argtypes) in signatures.items():
        fn = getattr(lib, name)
        fn.restype, fn.argtypes = restype, argtypes
    account = json.loads((ROOT / '.benchmark-accounts/octra-devnet.secret.json').read_text())
    seed = c.create_string_buffer(base64.b64decode(account['privateKeyBase64']))
    params, pk, sk = lib.pvac_default_params(), ptr(), ptr()
    start = time.perf_counter_ns()
    lib.pvac_keygen_from_seed(params, seed, c.byref(pk), c.byref(sk))
    setup_ms = (time.perf_counter_ns() - start) / 1e6
    if not pk or not sk:
        raise RuntimeError('Local key derivation failed')

    def serialize(fn, handle):
        length = size()
        buf = fn(handle, c.byref(length))
        if not buf or not length.value:
            raise RuntimeError('Serialization failed')
        try:
            return c.string_at(buf, length.value)
        finally:
            lib.pvac_free_bytes(buf)

    def encrypt(value):
        if not 0 <= value < 2**64:
            raise ValueError('Encryption input outside u64 fixture range')
        handle = lib.pvac_enc_value_seeded(pk, sk, value, c.create_string_buffer(os.urandom(32)))
        if not handle:
            raise RuntimeError('Encryption failed')
        return handle

    def decrypt(handle):
        lo, hi = u64(), u64()
        lib.pvac_dec_value_fp(pk, sk, handle, c.byref(lo), c.byref(hi))
        return str(lo.value + (hi.value << 64))

    def response(req):
        op = req['op']
        if op == 'prepare':
            fixtures = {}
            for name, value in [('reading', 43), ('initial_total', 42), ('odd_left', 42), ('odd_right', 17)]:
                start = time.perf_counter_ns()
                ct = encrypt(value)
                encrypted_ms = (time.perf_counter_ns() - start) / 1e6
                try:
                    start = time.perf_counter_ns()
                    raw = serialize(lib.pvac_serialize_cipher_public, ct)
                    serialized_ms = (time.perf_counter_ns() - start) / 1e6
                    fixtures[name] = {'plaintext': str(value), 'ciphertext': base64.b64encode(raw).decode(),
                                      'ciphertextSha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw),
                                      'encryptionMs': encrypted_ms, 'serializationMs': serialized_ms,
                                      'inputPreparationMs': encrypted_ms + serialized_ms}
                finally:
                    lib.pvac_free_cipher(ct)
            public = serialize(lib.pvac_serialize_pubkey, pk)
            return {'address': account['address'], 'keySetupMs': setup_ms,
                    'librarySha256': hashlib.sha256(LIB.read_bytes()).hexdigest(),
                    'publicKeySha256': hashlib.sha256(public).hexdigest(), 'publicKeyBytes': len(public),
                    'fieldModulus': str(P), 'fixtures': fixtures}
        if op == 'decrypt':
            raw = base64.b64decode(req['ciphertext'], validate=True)
            start = time.perf_counter_ns()
            ct = lib.pvac_deserialize_cipher(c.create_string_buffer(raw), len(raw))
            deserialize_ms = (time.perf_counter_ns() - start) / 1e6
            if not ct:
                raise RuntimeError('Result ciphertext invalid')
            try:
                start = time.perf_counter_ns()
                value = decrypt(ct)
                return {'plaintext': value, 'deserializeMs': deserialize_ms,
                        'decryptionMs': (time.perf_counter_ns() - start) / 1e6}
            finally:
                lib.pvac_free_cipher(ct)
        if op == 'local_checks':
            cases = []
            for left, right in [(43, 85), (42, 17)]:
                handles = [encrypt(left), encrypt(right)]
                try:
                    summed = lib.pvac_ct_add(pk, handles[0], handles[1]); handles.append(summed)
                    divided = lib.pvac_ct_div_const(pk, summed, 2, 0); handles.append(divided)
                    actual = int(decrypt(divided))
                    cases.append({'operation': 'mean_field', 'inputs': [left, right],
                                  'actual': str(actual), 'expectedFloorInteger': str((left + right) // 2),
                                  'expectedField': str(((left + right) * pow(2, -1, P)) % P),
                                  'matchesIntegerMean': actual == (left + right) // 2,
                                  'matchesField': actual == ((left + right) * pow(2, -1, P)) % P})
                finally:
                    for ct in reversed(handles):
                        if ct:
                            lib.pvac_free_cipher(ct)
            return {'cases': cases, 'keySetupMs': setup_ms}
        raise ValueError('Unknown worker operation')

    print(json.dumps({'ready': True, 'address': account['address'], 'keySetupMs': setup_ms}), flush=True)
    try:
        for line in sys.stdin:
            try:
                request = json.loads(line)
                if request.get('op') == 'close':
                    break
                result = response(request)
                print(json.dumps({'ok': True, 'result': result}), flush=True)
            except Exception as exc:
                print(json.dumps({'ok': False, 'error': type(exc).__name__}), flush=True)
    finally:
        lib.pvac_free_pubkey(pk)
        lib.pvac_free_seckey(sk)
        lib.pvac_free_params(params)


if __name__ == '__main__':
    main()

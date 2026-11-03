"""Exercise the wallet's actual PVAC C ABI. Local timings exclude blockchain work."""

import argparse
import base64
import ctypes as c
import json
import os
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "logs/octra-pilot"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--decrypt", type=Path)
    args = parser.parse_args()
    lib = c.CDLL(str(OUT / "vendor/webcli/pvac/build/libpvac.so"))
    ptr, u64, size = c.c_void_p, c.c_uint64, c.c_size_t
    signatures = {
        "pvac_default_params": (ptr, []),
        "pvac_keygen_from_seed": (None, [ptr, ptr, c.POINTER(ptr), c.POINTER(ptr)]),
        "pvac_enc_value_seeded": (ptr, [ptr, ptr, u64, ptr]),
        "pvac_dec_value_fp": (None, [ptr, ptr, ptr, c.POINTER(u64), c.POINTER(u64)]),
        "pvac_ct_add": (ptr, [ptr, ptr, ptr]),
        "pvac_ct_scale": (ptr, [ptr, ptr, c.c_int64]),
        "pvac_serialize_cipher_public": (ptr, [ptr, c.POINTER(size)]),
        "pvac_serialize_pubkey": (ptr, [ptr, c.POINTER(size)]),
        "pvac_deserialize_cipher": (ptr, [ptr, size]),
        "pvac_aes_kat": (None, [ptr]),
    }
    for name in ("params", "pubkey", "seckey", "cipher", "bytes"):
        signatures["pvac_free_" + name] = (None, [ptr])
    for name, (result, arguments) in signatures.items():
        fn = getattr(lib, name)
        fn.restype, fn.argtypes = result, arguments
    account = json.loads(
        (ROOT / ".benchmark-accounts/octra-devnet.secret.json").read_text()
    )
    seed = c.create_string_buffer(base64.b64decode(account["privateKeyBase64"]))
    params, pk, sk = lib.pvac_default_params(), ptr(), ptr()
    started = time.perf_counter_ns()
    lib.pvac_keygen_from_seed(params, seed, c.byref(pk), c.byref(sk))
    keygen_ms = (time.perf_counter_ns() - started) / 1e6
    if not pk or not sk:
        raise RuntimeError("PVAC key generation returned no keys")

    def serialize(fn, handle):
        length = size()
        buf = fn(handle, c.byref(length))
        if not buf or not length.value:
            raise RuntimeError("PVAC serialization failed")
        try:
            return c.string_at(buf, length.value)
        finally:
            lib.pvac_free_bytes(buf)

    def decrypt(handle):
        lo, hi = u64(), u64()
        lib.pvac_dec_value_fp(pk, sk, handle, c.byref(lo), c.byref(hi))
        return lo.value + (hi.value << 64)

    def encrypt(value):
        handle = lib.pvac_enc_value_seeded(
            pk, sk, value, c.create_string_buffer(os.urandom(32))
        )
        if not handle:
            raise RuntimeError("PVAC encryption failed")
        return handle

    if args.decrypt:
        raw = base64.b64decode(
            json.loads(args.decrypt.read_text())["ciphertext"], validate=True
        )
        handle = lib.pvac_deserialize_cipher(c.create_string_buffer(raw), len(raw))
        if not handle:
            raise RuntimeError("Invalid result ciphertext")
        try:
            print(json.dumps({"value": str(decrypt(handle))}))
        finally:
            lib.pvac_free_cipher(handle)
    else:
        report = {
            "scope": "local-wallet-library",
            "networkExecution": False,
            "keygenMs": keygen_ms,
            "cases": [],
            "address": account["address"],
        }
        fixtures = {
            "address": account["address"],
            "publicKeyBase64": base64.b64encode(
                serialize(lib.pvac_serialize_pubkey, pk)
            ).decode(),
        }
        kat = c.create_string_buffer(16)
        lib.pvac_aes_kat(kat)
        fixtures["aesKatHex"] = kat.raw.hex()
        for a, b, factor in [
            (42, 17, 3),
            (0, 1, 0),
            (1, 0, 1),
            (255, 1024, 7),
            (4294967295, 17, 2),
        ]:
            ca, cb = encrypt(a), encrypt(b)
            if a == 42:
                fixtures.update(
                    {
                        "left": base64.b64encode(
                            serialize(lib.pvac_serialize_cipher_public, ca)
                        ).decode(),
                        "right": base64.b64encode(
                            serialize(lib.pvac_serialize_cipher_public, cb)
                        ).decode(),
                        "inputs": [a, b],
                        "scalar": factor,
                    }
                )
            raw = serialize(lib.pvac_serialize_cipher_public, ca)
            restored = lib.pvac_deserialize_cipher(
                c.create_string_buffer(raw), len(raw)
            )
            operations = [
                ("store_roundtrip", lambda: restored, a),
                ("add", lambda: lib.pvac_ct_add(pk, ca, cb), a + b),
                ("scale", lambda: lib.pvac_ct_scale(pk, ca, factor), a * factor),
            ]
            for name, operation, expected in operations:
                start = time.perf_counter_ns()
                result = operation()
                compute_ms = (time.perf_counter_ns() - start) / 1e6
                if not result:
                    raise RuntimeError("PVAC operation returned no ciphertext")
                value = decrypt(result)
                case = {
                    "operation": name,
                    "inputs": [a, b],
                    "scalar": factor,
                    "expected": str(expected),
                    "actual": str(value),
                    "correct": value == expected,
                    "computeMs": compute_ms,
                }
                report["cases"].append(case)
                lib.pvac_free_cipher(result)
            lib.pvac_free_cipher(ca)
            lib.pvac_free_cipher(cb)
        (OUT / "local-probe.json").write_text(json.dumps(report, indent=2) + "\n")
        (OUT / "fixtures.json").write_text(json.dumps(fixtures, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "passed": sum(x["correct"] for x in report["cases"]),
                    "total": len(report["cases"]),
                    "keygenMs": keygen_ms,
                }
            )
        )
        if not all(x["correct"] for x in report["cases"]):
            raise RuntimeError("Local ciphertext correctness check failed")
    lib.pvac_free_pubkey(pk)
    lib.pvac_free_seckey(sk)
    lib.pvac_free_params(params)


if __name__ == "__main__":
    main()

# Concurrency correctness with 1, 2 and 4 writers

Twenty windows per configuration/platform; eight requests per window. The new two-writer sessions use matching reference seeds and plaintext inputs, but run at different times and on separate contracts. No causal performance ranking is implied.

| Mode | Writers | Platform | Primary valid | Late validated | Reordered | Final differs from planned | Inconsistent |
|---|---:|---|---:|---:|---:|---:|---:|
| shared_sum | 1 | baseline | 20/20 | 0 | 0/20 | 0/20 | 0 |
| shared_sum | 1 | zama | 19/20 | 1 | 0/20 | 0/20 | 0 |
| shared_sum | 1 | fhenix | 20/20 | 0 | 0/20 | 0/20 | 0 |
| shared_sum | 2 | baseline | 20/20 | 0 | 20/20 | 0/20 | 0 |
| shared_sum | 2 | zama | 20/20 | 0 | 20/20 | 0/20 | 0 |
| shared_sum | 2 | fhenix | 20/20 | 0 | 20/20 | 0/20 | 0 |
| shared_sum | 4 | baseline | 20/20 | 0 | 20/20 | 0/20 | 0 |
| shared_sum | 4 | zama | 20/20 | 0 | 20/20 | 0/20 | 0 |
| shared_sum | 4 | fhenix | 20/20 | 0 | 20/20 | 0/20 | 0 |
| shared_ordered | 1 | baseline | 20/20 | 0 | 0/20 | 0/20 | 0 |
| shared_ordered | 1 | zama | 20/20 | 0 | 0/20 | 0/20 | 0 |
| shared_ordered | 1 | fhenix | 20/20 | 0 | 0/20 | 0/20 | 0 |
| shared_ordered | 2 | baseline | 20/20 | 0 | 20/20 | 20/20 | 0 |
| shared_ordered | 2 | zama | 20/20 | 0 | 20/20 | 20/20 | 0 |
| shared_ordered | 2 | fhenix | 20/20 | 0 | 20/20 | 20/20 | 0 |
| shared_ordered | 4 | baseline | 20/20 | 0 | 20/20 | 20/20 | 0 |
| shared_ordered | 4 | zama | 20/20 | 0 | 20/20 | 20/20 | 0 |
| shared_ordered | 4 | fhenix | 20/20 | 0 | 20/20 | 20/20 | 0 |

import os
import json
from typing import Any, Set

def load_json(filepath: str) -> Any:
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_all_keys(d: Any, prefix: str = '') -> Set[str]:
    keys = set()
    if isinstance(d, dict):
        for k, v in d.items():
            full_key = f'{prefix}.{k}' if prefix else k
            keys.add(full_key)
            keys.update(get_all_keys(v, full_key))
    return keys

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    ref_file = os.path.join(base_dir, 'en.json')
    ref_json = load_json(ref_file)
    ref_keys = get_all_keys(ref_json)

    for fname in os.listdir(base_dir):
        if fname.endswith('.json') and fname != 'en.json':
            fpath = os.path.join(base_dir, fname)
            try:
                target_json = load_json(fpath)
                target_keys = get_all_keys(target_json)
                missing = ref_keys - target_keys
                if missing:
                    print(f'\nMissing keys in {fname}:')
                    for key in sorted(missing):
                        print(f'  {key}')
                else:
                    print(f'\n{fname}: All keys present.')
            except Exception as e:
                print(f'Error reading {fname}: {e}')

if __name__ == '__main__':
    main()

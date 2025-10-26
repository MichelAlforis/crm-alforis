#!/usr/bin/env python3
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]  # crm-backend
migrations = root / "alembic" / "versions"

patterns = [
    # revision / down_revision: guillemets mélangés
    (r'(revision\s*=\s*)"([^"\']+)\'', r'\1"\2"'),
    (r'(down_revision\s*=\s*)"([^"\']+)\'', r'\1"\2"'),
    # server_default 'true"/'false"  -> 'true'/'false'
    (r"server_default='(true|false)\"", r"server_default='\1'"),
    # server_default sa.text('now()") -> sa.text('now()')
    (r"server_default=sa\.text\('now\(\)\"\)", r"server_default=sa.text('now()')"),
    # comments mal fermés: comment='..."
    (r"(comment=')([^']+)\"", r"\1\2'"),
    # ondelete='SET NULL" -> ondelete='SET NULL'
    (r"(ondelete=')([^']+)\"", r"\1\2'"),
    # op.create_index(op.f('xxx"), 'yyy' -> op.create_index(op.f('xxx'), 'yyy'
    (r"op\.create_index\(op\.f\('([^']+)\"\)", r"op.create_index(op.f('\1')"),
    # op.drop_index(op.f('xxx"), table_name='yyy" -> op.drop_index(op.f('xxx'), table_name='yyy'
    (r"op\.drop_index\(op\.f\('([^']+)\"\)", r"op.drop_index(op.f('\1')"),
    # table_name='xxx" -> table_name='xxx'
    (r"table_name='([^']+)\"", r"table_name='\1'"),
    # op.drop_table('xxx" -> op.drop_table('xxx'
    (r"op\.drop_table\('([^']+)\"", r"op.drop_table('\1'"),
    # op.drop_column('xxx", "yyy" -> op.drop_column('xxx', 'yyy'
    (r"op\.drop_column\('([^']+)\"\s*,\s*\"([^\"]+)\"", r"op.drop_column('\1', '\2'"),
    # PrimaryKeyConstraint("id") -> PrimaryKeyConstraint('id')
    (r'PrimaryKeyConstraint\("([^"]+)"\)', r"PrimaryKeyConstraint('\1')"),
]

for f in sorted(migrations.glob("*.py")):
    txt = f.read_text(encoding="utf-8")
    orig = txt
    for pat, repl in patterns:
        txt = re.sub(pat, repl, txt)
    if txt != orig:
        f.write_text(txt, encoding="utf-8")
        print(f"Fixed: {f.name}")
    else:
        print(f"No changes: {f.name}")

import asyncio
from fireblocks_sdk import FireblocksSDK, PagedVaultAccountsRequestFilters
from dotenv import load_dotenv
import os
import json

load_dotenv()

def categorize_vaults():
    api_key = os.environ.get('FIREBLOCKS_API_KEY')
    secret_path = os.environ.get('FIREBLOCKS_SECRET_KEY_PATH')
    base_url = os.environ.get('FIREBLOCKS_BASE_PATH', 'https://api.fireblocks.io')

    with open(secret_path, 'r') as f:
        secret = f.read()

    fb = FireblocksSDK(private_key=secret, api_key=api_key, api_base_url=base_url)
    filters = PagedVaultAccountsRequestFilters()
    result = fb.get_vault_accounts_with_page_info(filters)
    accounts = result.get('accounts', [])

    kbex_system = []      # KBEX internal/system vaults
    kbex_clients = []     # KBEX named client vaults
    legacy_kryp = []      # Old kryptobox auto-generated
    legacy_named = []     # Old kryptobox named vaults
    
    for a in accounts:
        vid = a['id']
        name = a.get('name', '')
        hidden = a.get('hiddenOnUI', False)
        assets = a.get('assets', [])
        
        total_balance = 0
        balances = {}
        for asset in assets:
            bal = float(asset.get('total', 0))
            if bal > 0:
                balances[asset['id']] = bal
                total_balance += bal

        vault_info = {
            'id': vid,
            'name': name,
            'hidden': hidden,
            'asset_count': len(assets),
            'balances': balances,
            'has_balance': total_balance > 0,
        }

        # Categorize
        if name.startswith('KBEX') or name in ('GAS STATION', 'VAULT KBEX', 'MTA'):
            kbex_system.append(vault_info)
        elif name.startswith('kryp_'):
            legacy_kryp.append(vault_info)
        elif name.startswith('Kryptobox') or name.startswith('kryptobox'):
            legacy_named.append(vault_info)
        else:
            # Named vaults - check if they look like KBEX clients or old
            if int(vid) >= 63:  # KBEX era vaults (ID 63+)
                kbex_clients.append(vault_info)
            else:
                legacy_named.append(vault_info)

    print('=' * 70)
    print(f'  SISTEMA KBEX (Internos)  — {len(kbex_system)} vaults')
    print('=' * 70)
    for v in kbex_system:
        bal_str = ', '.join([f'{k}: {v2}' for k, v2 in v['balances'].items()]) if v['balances'] else '-'
        print(f"  [{v['id']}] {v['name']} ({v['asset_count']} assets) | Saldo: {bal_str}")
    
    print()
    print('=' * 70)
    print(f'  CLIENTES KBEX (Novos)  — {len(kbex_clients)} vaults')
    print('=' * 70)
    for v in kbex_clients:
        bal_str = ', '.join([f'{k}: {v2}' for k, v2 in v['balances'].items()]) if v['balances'] else '-'
        print(f"  [{v['id']}] {v['name']} ({v['asset_count']} assets) | Saldo: {bal_str}")

    print()
    print('=' * 70)
    print(f'  LEGACY KRYPTOBOX (Nomeados)  — {len(legacy_named)} vaults')
    print('=' * 70)
    for v in legacy_named:
        bal_str = ', '.join([f'{k}: {v2}' for k, v2 in v['balances'].items()]) if v['balances'] else '-'
        h = ' [HIDDEN]' if v['hidden'] else ''
        print(f"  [{v['id']}] {v['name']}{h} ({v['asset_count']} assets) | Saldo: {bal_str}")

    print()
    print('=' * 70)
    print(f'  LEGACY KRYPTOBOX (Auto-gerados kryp_*)  — {len(legacy_kryp)} vaults')
    print('=' * 70)
    with_balance = [v for v in legacy_kryp if v['has_balance']]
    without_balance = [v for v in legacy_kryp if not v['has_balance']]
    
    if with_balance:
        print(f'\n  COM SALDO ({len(with_balance)}):')
        for v in with_balance:
            bal_str = ', '.join([f'{k}: {v2}' for k, v2 in v['balances'].items()])
            print(f"    [{v['id']}] {v['name']} | {bal_str}")
    
    print(f'\n  SEM SALDO ({len(without_balance)}):')
    for v in without_balance:
        print(f"    [{v['id']}] {v['name']} ({v['asset_count']} assets)")

    print()
    print('=' * 70)
    print('  RESUMO')
    print('=' * 70)
    print(f'  Total Fireblocks:        {len(accounts)} vaults')
    print(f'  Sistema KBEX:            {len(kbex_system)}')
    print(f'  Clientes KBEX:           {len(kbex_clients)}')
    print(f'  Legacy nomeados:         {len(legacy_named)}')
    print(f'  Legacy auto-gerados:     {len(legacy_kryp)}')
    print(f'    — com saldo:           {len(with_balance)}')
    print(f'    — sem saldo (ocultar): {len(without_balance)}')

    return {
        'kbex_system': kbex_system,
        'kbex_clients': kbex_clients,
        'legacy_named': legacy_named,
        'legacy_kryp_with_balance': with_balance,
        'legacy_kryp_empty': without_balance,
    }

if __name__ == '__main__':
    categorize_vaults()

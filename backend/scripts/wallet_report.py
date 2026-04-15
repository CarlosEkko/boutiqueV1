import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

async def main():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'kbex_db')]

    print('=' * 60)
    print('CONFIGURAÇÃO OMNIBUS')
    print('=' * 60)
    config = await db.omnibus_config.find_one({}, {'_id': 0})
    if config:
        print(f'  Vault Fireblocks ID: {config.get("fireblocks_vault_id")}')
        print(f'  Vault Name: {config.get("vault_name")}')
    else:
        print('  Nao configurado')

    print()
    sat_config = await db.satoshi_vault_config.find_one({}, {'_id': 0})
    if sat_config:
        print('VAULT SATOSHI TEST')
        print(f'  Vault Fireblocks ID: {sat_config.get("fireblocks_vault_id")}')
        print(f'  Nome: {sat_config.get("vault_name")}')
        print(f'  Criado: {sat_config.get("created_at")}')

    print()
    print('=' * 60)
    print('COFRES (Omnibus Ledger)')
    print('=' * 60)

    pipeline = [
        {"$group": {
            "_id": "$sub_account_id",
            "cofre_name": {"$first": "$cofre_name"},
            "user_id": {"$first": "$user_id"},
            "otc_client_id": {"$first": "$otc_client_id"},
            "client_label": {"$first": "$client_label"},
            "assets": {"$push": {"asset": "$asset", "balance": "$balance"}},
            "created_at": {"$first": "$created_at"},
        }},
        {"$sort": {"created_at": -1}}
    ]

    cofres = await db.omnibus_ledger.aggregate(pipeline).to_list(100)
    print(f'  Total de cofres: {len(cofres)}')
    print()

    for c in cofres:
        owner = c.get('client_label') or c.get('user_id') or 'N/A'
        assets_str = ', '.join([f"{a['asset']}: {a['balance']}" for a in c.get('assets', [])])
        print(f'  Cofre: {c.get("cofre_name", "?")}')
        print(f'    Sub-Account: {c["_id"]}')
        print(f'    Owner: {owner}')
        if c.get('otc_client_id'):
            print(f'    OTC Client: {c["otc_client_id"]}')
        print(f'    Assets: {assets_str}')
        print(f'    Criado: {c.get("created_at", "?")}')
        print()

    # Fireblocks Vaults
    print('=' * 60)
    print('VAULTS FIREBLOCKS (API)')
    print('=' * 60)
    try:
        from fireblocks_sdk import FireblocksSDK, PagedVaultAccountsRequestFilters
        api_key = os.environ.get('FIREBLOCKS_API_KEY')
        secret_path = os.environ.get('FIREBLOCKS_SECRET_KEY_PATH')
        base_url = os.environ.get('FIREBLOCKS_BASE_PATH', 'https://api.fireblocks.io')

        with open(secret_path, 'r') as f:
            secret = f.read()

        fb = FireblocksSDK(private_key=secret, api_key=api_key, api_base_url=base_url)
        filters = PagedVaultAccountsRequestFilters()
        result = fb.get_vault_accounts_with_page_info(filters)
        accounts = result.get('accounts', [])
        print(f'  Total de vaults Fireblocks: {len(accounts)}')
        print()

        for a in accounts:
            assets = a.get('assets', [])
            assets_info = []
            for asset in assets:
                bal = float(asset.get('total', 0))
                assets_info.append(f"{asset['id']}: {bal}")
            assets_str = ', '.join(assets_info) if assets_info else 'sem assets'
            hidden = ' [HIDDEN]' if a.get('hiddenOnUI') else ''
            print(f'  Vault {a["id"]}: {a["name"]}{hidden}')
            print(f'    Assets ({len(assets)}): {assets_str}')
            print()
    except Exception as e:
        print(f'  Erro: {e}')

    client.close()

asyncio.run(main())

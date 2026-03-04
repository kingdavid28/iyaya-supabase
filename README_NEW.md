# iYaya - Caregiver Booking Platform 👶

A React Native mobile application connecting parents with verified caregivers, featuring blockchain-based payments via Solana.

## 🚀 Quick Start

### For Immediate Tasks
- **[Start Here](docs/quick-start/START_HERE.txt)** - Visual quick reference
- **[Action Required](docs/quick-start/ACTION_NOW.md)** - Immediate actions needed
- **[Quick Reference](docs/quick-start/QUICK_START.txt)** - Quick command reference

### For Setup & Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## 📚 Documentation

### Guides
- [Migration Guide](docs/guides/MIGRATION_GUIDE.md) - Database migration instructions
- [Immediate Checklist](docs/guides/IMMEDIATE_CHECKLIST.md) - Step-by-step tasks
- [Contract & Payment Flow](docs/guides/CONTRACT_WALLET_PAYMENT_FLOW.md) - How payments work

### Reference
- [Complete Index](docs/reference/INDEX.md) - All documentation index
- [Role Mapping](docs/reference/ROLE_MAPPING_FIX_SUMMARY.md) - Role system details
- [Flow Diagrams](docs/reference/FLOW_DIAGRAM.md) - Architecture diagrams

### Deployment
- [Solana Deployment](docs/deployment/DEPLOY_SOLANA_ENDPOINT.md) - Deploy payment endpoint
- [Wallet Setup](docs/deployment/WALLET_SETUP_FIX.md) - Wallet configuration

## 🏗️ Project Structure

```
iyayaSupa/
├── src/                    # Application source code
│   ├── components/         # React components
│   ├── screens/           # Screen components
│   ├── services/          # API services
│   ├── contexts/          # React contexts
│   └── utils/             # Utility functions
├── database/              # Database files
│   ├── migrations/        # SQL migrations
│   └── scripts/           # Database scripts
├── scripts/               # Development scripts
│   ├── test/             # Test scripts
│   ├── server/           # Server scripts
│   └── setup/            # Setup scripts
├── docs/                  # Documentation
├── assets/               # Static assets
└── supabase/             # Supabase config
```

## 🗄️ Database

### Run Migrations
```bash
# See database/migrations/README.md for details
# Run migrations in Supabase SQL Editor in order:
# 1. 005_complete_wallet_fix.sql
# 2. 006_fix_role_constraint.sql
# 3. 012_fix_role_consistency.sql
# 4. 013_cleanup_duplicate_policies.sql
```

### Database Scripts
- [Migrations](database/migrations/) - All SQL migrations
- [Scripts](database/scripts/) - Utility SQL scripts

## 🧪 Testing

```bash
# Run test scripts
node scripts/test/test-auth.js
node scripts/test/test-wallet-save.js
```

See [scripts/test/](scripts/test/) for all test scripts.

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_SOLANA_RPC_URL=your_solana_rpc
```

## 🎯 Key Features

- ✅ **User Authentication** - Parent & Caregiver roles
- ✅ **Job Contracts** - Digital contract signing
- ✅ **Blockchain Payments** - Solana/USDC payments
- ✅ **Wallet Integration** - Crypto wallet support
- ✅ **Points System** - Caregiver rewards
- ✅ **Real-time Updates** - Live notifications

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Supabase (PostgreSQL)
- **Blockchain**: Solana Web3.js
- **Authentication**: Supabase Auth
- **Payments**: Solana Pay

## 📱 Supported Platforms

- iOS (via Expo)
- Android (via Expo)
- Web (Progressive Web App)

## 🤝 Contributing

1. Follow the folder structure
2. Write tests for new features
3. Update documentation
4. Follow code style guidelines

## 📄 License

[Your License Here]

## 🆘 Support

- **Documentation**: See [docs/](docs/) folder
- **Issues**: Check existing documentation first
- **Database**: See [database/migrations/README.md](database/migrations/README.md)

## 🔗 Links

- [Supabase Dashboard](https://supabase.com)
- [Solana Documentation](https://docs.solana.com)
- [Expo Documentation](https://docs.expo.dev)

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Active Development

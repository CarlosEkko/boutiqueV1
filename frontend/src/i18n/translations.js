// Translations for KBEX.io
// Supports English (EN), Portuguese (PT), and Arabic (AR)

const translations = {
  EN: {
    // Navigation
    nav: {
      home: 'Home',
      products: 'Products',
      markets: 'Markets',
      trading: 'Trading',
      earn: 'Earn',
      institutional: 'Institutional',
      cryptoAtm: 'Crypto ATM',
      whyUs: 'Why Us',
      regions: 'Regions',
      contact: 'Contact',
      requestAccess: 'Request Access',
      login: 'Login',
      profile: 'Profile'
    },
    
    // Auth
    auth: {
      welcomeBack: 'Welcome Back',
      createAccount: 'Create Account',
      loginDescription: 'Sign in to access your account',
      registerDescription: 'Join our exclusive platform',
      fullName: 'Full Name',
      email: 'Email',
      password: 'Password',
      phone: 'Phone Number',
      country: 'Country',
      selectCountry: 'Select your country',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      processing: 'Processing...',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      backToHome: 'Back to Home',
      loginSuccess: 'Login successful!',
      registerSuccess: 'Account created successfully!',
      logoutSuccess: 'Logged out successfully!',
      logout: 'Logout'
    },
    
    // Profile
    profile: {
      backToHome: 'Back to Home',
      edit: 'Edit Profile',
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone Number',
      country: 'Country',
      selectCountry: 'Select your country',
      memberSince: 'Member Since',
      verified: 'Verified Member',
      notProvided: 'Not provided',
      cannotChange: 'Cannot be changed',
      updateSuccess: 'Profile updated successfully!'
    },
    
    // Common
    common: {
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel'
    },
    
    // Hero Section
    hero: {
      badge: 'EXCLUSIVE ACCESS • INSTITUTIONAL GRADE',
      title: 'The Boutique Exchange for',
      subtitle: 'Sophisticated Investors',
      description: 'Exclusive cryptocurrency services tailored for high-net-worth individuals and institutional clients across Europe, Middle East, and Brazil.',
      ctaPrimary: 'Request Access',
      ctaSecondary: 'Learn More',
      trustLicensed: 'Licensed & Regulated',
      trustSecurity: 'Bank-Level Security',
      trustAuc: '$2.5B+ AUC'
    },
    
    // Products Section
    products: {
      badge: 'Premium Services',
      title: 'Tailored for',
      titleHighlight: 'Exceptional Clients',
      description: 'Four pillars of excellence designed exclusively for institutional and high-net-worth investors',
      items: [
        {
          title: 'Premium Exchange',
          description: 'White-glove OTC trading desk with dedicated relationship managers. Execute large-volume trades with institutional-grade liquidity and discretion.',
          features: ['24/7 Dedicated Support', 'Institutional Liquidity', 'Best Execution Guaranteed']
        },
        {
          title: 'Crypto ATM Network',
          description: 'Curated network of premium crypto ATMs in exclusive locations. Seamless fiat-to-crypto conversions with enhanced privacy and convenience.',
          features: ['Prime Locations', 'Enhanced Privacy', 'Multi-Currency Support']
        },
        {
          title: 'Exclusive Launchpad',
          description: 'Early access to vetted blockchain projects and token sales. Participate in pre-vetted opportunities unavailable to retail investors.',
          features: ['Vetted Projects Only', 'Early Access', 'Due Diligence Reports']
        },
        {
          title: 'Institutional Custody',
          description: 'Military-grade security with multi-signature cold storage. Bank-level insurance and compliance for peace of mind.',
          features: ['Cold Storage', 'Multi-Sig Security', 'Insured Assets']
        }
      ]
    },
    
    // Trust Section
    trust: {
      title: 'Why the Elite',
      titleHighlight: 'Choose KBEX',
      description: 'Uncompromising standards that set us apart in the digital asset space',
      regulated: 'Regulated & Compliant',
      regulatedDesc: 'Fully licensed and regulated across European jurisdictions. MiCA-compliant operations ensuring legal certainty.',
      security: 'Bank-Level Security',
      securityDesc: 'Multi-layered security infrastructure with 98% cold storage. Regular third-party security audits.',
      exclusive: 'Exclusive Service',
      exclusiveDesc: 'Membership-only platform with dedicated relationship managers. Personalized service for sophisticated clients.',
      global: 'Global Reach',
      globalDesc: 'Seamless operations across Europe, Middle East, and Brazil. Local presence with global capabilities.',
      stats: {
        auc: '$2.5B+',
        aucLabel: 'Assets Under Custody',
        clients: '500+',
        clientsLabel: 'Institutional Clients',
        uptime: '99.9%',
        uptimeLabel: 'Platform Uptime',
        support: '24/7',
        supportLabel: 'Dedicated Support'
      }
    },
    
    // Regions Section
    regions: {
      badge: 'Global Presence',
      title: 'Serving Excellence',
      titleHighlight: 'Across Three Continents',
      description: 'Local expertise with global reach - where you need us, when you need us',
      europe: 'Europe',
      europeDesc: 'Headquarters in Switzerland with presence across EU financial hubs',
      middleEast: 'Middle East',
      middleEastDesc: 'Serving UHNW clients in Dubai, Abu Dhabi, and Riyadh',
      brazil: 'Brazil',
      brazilDesc: "Exclusive services for Latin America's growing crypto economy"
    },
    
    // Contact Section
    contact: {
      badge: 'Get Started',
      title: 'Join the',
      titleHighlight: 'Exclusive Circle',
      description: 'Submit your interest and our team will reach out to discuss how KBEX can serve your digital asset needs.',
      form: {
        fullName: 'Full Name',
        email: 'Email Address',
        phone: 'Phone Number',
        investmentRange: 'Investment Range',
        selectRange: 'Select your range',
        range1: '$100K - $500K',
        range2: '$500K - $1M',
        range3: '$1M - $5M',
        range4: '$5M+',
        message: 'Tell us about your needs',
        submit: 'Request Access',
        disclaimer: 'Your information is protected by our privacy policy and will only be used to assess membership eligibility.'
      }
    },
    
    // Dashboard
    dashboard: {
      // Layout
      layout: {
        portfolio: 'Portfolio',
        admin: 'Admin',
        loggedInAs: 'Logged in as',
        logout: 'Logout'
      },
      // Navigation
      nav: {
        overview: 'Overview',
        wallets: 'Wallets',
        transactions: 'Transactions',
        investments: 'Investments',
        roi: 'ROI',
        transparency: 'Transparency',
        kycVerification: 'KYC Verification',
        adminOverview: 'Admin Overview',
        users: 'Users',
        kycKyb: 'KYC/KYB',
        opportunities: 'Opportunities',
        inviteCodes: 'Invite Codes'
      },
      // Overview
      overview: {
        welcome: 'Welcome back',
        portfolioValue: 'Portfolio Value',
        totalAssets: 'Total Assets',
        activeInvestments: 'Active Investments',
        pendingTransactions: 'Pending',
        recentActivity: 'Recent Activity',
        noActivity: 'No recent activity',
        viewAll: 'View All'
      },
      // Wallets
      wallets: {
        title: 'Your Wallets',
        subtitle: 'Manage your cryptocurrency wallets',
        balance: 'Balance',
        available: 'Available',
        pending: 'Pending',
        address: 'Address',
        copyAddress: 'Copy Address',
        deposit: 'Deposit',
        withdraw: 'Withdraw',
        noWallets: 'No wallets found'
      },
      // Transactions
      transactions: {
        title: 'Transaction History',
        subtitle: 'View all your transactions',
        type: 'Type',
        amount: 'Amount',
        status: 'Status',
        date: 'Date',
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        transfer: 'Transfer',
        completed: 'Completed',
        pending: 'Pending',
        failed: 'Failed',
        noTransactions: 'No transactions found'
      },
      // Investments
      investments: {
        title: 'Investment Opportunities',
        subtitle: 'Explore available investment options',
        expectedRoi: 'Expected ROI',
        duration: 'Duration',
        minInvestment: 'Min Investment',
        maxInvestment: 'Max Investment',
        riskLevel: 'Risk Level',
        status: 'Status',
        open: 'Open',
        closed: 'Closed',
        invest: 'Invest',
        days: 'days',
        noOpportunities: 'No opportunities available'
      },
      // ROI
      roi: {
        title: 'Return on Investment',
        subtitle: 'Track your investment performance',
        totalInvested: 'Total Invested',
        totalReturns: 'Total Returns',
        averageRoi: 'Average ROI',
        activePositions: 'Active Positions',
        performanceChart: 'Performance Chart',
        noData: 'No investment data available'
      },
      // Transparency
      transparency: {
        title: 'Fund Transparency',
        subtitle: 'Proof of reserves and audit reports',
        proofOfReserves: 'Proof of Reserves',
        auditReports: 'Audit Reports',
        lastUpdated: 'Last Updated',
        totalReserves: 'Total Reserves',
        viewReport: 'View Report',
        noReports: 'No reports available'
      }
    },
    
    // KYC
    kyc: {
      // Status Page
      status: {
        title: 'Identity Verification',
        subtitle: 'Complete KYC/KYB verification to unlock all platform features',
        kycIndividual: 'KYC Individual',
        forIndividuals: 'For individuals',
        kycDescription: 'Personal identity verification. Required for operations up to €15,000/month.',
        kybBusiness: 'KYB Business',
        forBusinesses: 'For companies and institutions',
        kybDescription: 'Complete business verification. Required for institutional operations and higher limits.',
        notStarted: 'Not Started',
        inProgress: 'In Progress',
        pendingReview: 'Pending Review',
        approved: 'Approved',
        rejected: 'Rejected',
        verificationComplete: 'Verification complete',
        startKyc: 'Start KYC',
        startKyb: 'Start KYB',
        continueVerification: 'Continue Verification',
        tryAgain: 'Try Again',
        estimatedTime: 'Your verification is under review. Estimated time: 24-48 hours.',
        estimatedTimeKyb: 'Your verification is under review. Estimated time: 2-5 business days.',
        whyVerify: 'Why verify your identity?',
        benefits: [
          'Full access to all platform features',
          'Higher transaction limits',
          'Protection against fraud and unauthorized access',
          'Compliance with AML/KYC regulations',
          'Priority support and dedicated service'
        ],
        documents: {
          idDocument: 'ID Document (Passport, ID Card, or Driver\'s License)',
          selfieWithId: 'Selfie with document',
          proofOfAddress: 'Proof of address',
          certIncorporation: 'Certificate of incorporation',
          articlesAssociation: 'Articles of association',
          directorsUbos: 'Identification of directors and UBOs'
        }
      },
      // KYC Form
      form: {
        title: 'KYC Verification',
        subtitle: 'Complete all steps to verify your identity',
        back: 'Back',
        continue: 'Continue',
        submit: 'Submit KYC',
        saveInfo: 'Save Information',
        steps: {
          personalInfo: 'Personal Info',
          idDocument: 'ID Document',
          selfie: 'Selfie',
          proofAddress: 'Address'
        },
        personalInfo: {
          fullName: 'Full Name',
          dateOfBirth: 'Date of Birth',
          nationality: 'Nationality',
          countryResidence: 'Country of Residence',
          address: 'Address',
          city: 'City',
          postalCode: 'Postal Code'
        },
        idDocument: {
          documentType: 'Document Type',
          passport: 'Passport',
          idCard: 'ID Card',
          driversLicense: 'Driver\'s License',
          documentNumber: 'Document Number',
          expiryDate: 'Expiry Date',
          issuingCountry: 'Issuing Country',
          uploadDocument: 'Upload Document',
          frontDocument: 'Front of Document'
        },
        selfie: {
          title: 'Selfie Instructions',
          instructions: [
            'Hold the document next to your face',
            'Make sure both are clearly visible',
            'Good lighting, no reflections or shadows',
            'Do not wear sunglasses or hats'
          ],
          selfieWithId: 'Selfie with Document'
        },
        address: {
          acceptedDocs: 'Accepted Documents',
          docsList: [
            'Utility bill (water, electricity, gas, internet)',
            'Bank statement',
            'Official tax document',
            'Must be less than 3 months old'
          ],
          proofOfAddress: 'Proof of Address'
        },
        upload: {
          dragDrop: 'Drag a file or click to select',
          formats: 'Formats: JPG, PNG, PDF (max. 10MB)',
          uploadSuccess: 'Document uploaded successfully',
          upload: 'Upload'
        }
      },
      // KYB Form
      kybForm: {
        title: 'KYB Business Verification',
        subtitle: 'Complete all steps to verify your company',
        steps: {
          companyInfo: 'Company Info',
          documents: 'Documents',
          representatives: 'Representatives',
          addressProof: 'Proof'
        },
        companyInfo: {
          companyName: 'Company Name',
          companyType: 'Company Type',
          llc: 'Limited Liability Company (LLC)',
          corporation: 'Corporation',
          partnership: 'Partnership',
          soleProprietorship: 'Sole Proprietorship',
          nonProfit: 'Non-Profit / Foundation',
          other: 'Other',
          registrationNumber: 'Registration Number',
          taxId: 'Tax ID (if different)',
          incorporationDate: 'Date of Incorporation',
          incorporationCountry: 'Country of Incorporation',
          headquartersAddress: 'Headquarters Address',
          businessAddress: 'Business Address',
          businessCity: 'City',
          businessPostalCode: 'Postal Code',
          businessCountry: 'Country',
          contacts: 'Contacts',
          corporateEmail: 'Corporate Email',
          phone: 'Phone',
          website: 'Website'
        },
        documents: {
          requiredDocs: 'Required Documents',
          docsList: [
            'Certificate of incorporation or permanent certificate',
            'Articles of association / Bylaws',
            'Shareholder register'
          ],
          certIncorporation: 'Certificate of Incorporation',
          articlesAssociation: 'Articles of Association / Bylaws',
          shareholderRegister: 'Shareholder Register'
        },
        representatives: {
          title: 'Legal Representatives',
          description: 'Add all directors and ultimate beneficial owners (UBOs) with ownership above 25%.',
          addedReps: 'Added Representatives',
          addRepresentative: 'Add Representative',
          fullName: 'Full Name',
          role: 'Role',
          dateOfBirth: 'Date of Birth',
          nationality: 'Nationality',
          ownershipPercentage: '% Ownership',
          isUbo: 'Ultimate Beneficial Owner (UBO)',
          add: 'Add Representative'
        },
        addressProof: {
          title: 'Business Address Proof',
          docsList: [
            'Utility bill in company name',
            'Corporate bank statement',
            'Official document with headquarters address',
            'Must be less than 3 months old'
          ],
          businessProof: 'Business Address Proof',
          taxRegistration: 'Tax Registration (optional)'
        },
        submit: 'Submit KYB'
      },
      // Admin KYC
      admin: {
        title: 'KYC/KYB Verifications',
        subtitle: 'Review and approve identity verification requests',
        searchPlaceholder: 'Search by name or email...',
        pending: 'Pending',
        kycPending: 'KYC Pending',
        kybPending: 'KYB Pending',
        approvedToday: 'Approved Today',
        noKycPending: 'No pending KYC verifications',
        noKybPending: 'No pending KYB verifications',
        allProcessed: 'All verifications have been processed',
        personalData: 'Personal Data',
        companyData: 'Company Data',
        idDocument: 'ID Document',
        representatives: 'Representatives',
        submittedDocuments: 'Submitted Documents',
        noDocuments: 'No documents found',
        rejectionReason: 'Rejection reason (required to reject)',
        rejectionPlaceholder: 'E.g.: Unreadable document, inconsistent data...',
        reject: 'Reject',
        approve: 'Approve',
        docs: 'docs',
        name: 'Name',
        dob: 'Date of Birth',
        nationalityLabel: 'Nationality',
        countryResidence: 'Country of Residence',
        addressLabel: 'Address',
        cityLabel: 'City',
        company: 'Company',
        type: 'Type',
        nipc: 'Registration No.',
        incorporationDateLabel: 'Incorporation Date',
        countryLabel: 'Country',
        emailLabel: 'Email',
        documentType: 'Type',
        documentNumber: 'Number',
        validity: 'Validity',
        issuingCountryLabel: 'Issuing Country'
      }
    },
    
    // Footer
    footer: {
      tagline: 'The boutique exchange for sophisticated investors.',
      company: 'Company',
      about: 'About Us',
      careers: 'Careers',
      press: 'Press',
      legal: 'Legal',
      services: 'Services',
      exchange: 'Exchange',
      atmNetwork: 'ATM Network',
      launchpad: 'Launchpad',
      custody: 'Custody',
      support: 'Support',
      helpCenter: 'Help Center',
      contactUs: 'Contact Us',
      status: 'System Status',
      security: 'Security',
      copyright: '© 2025 KBEX.io. All rights reserved.',
      disclaimer: 'Cryptocurrency trading involves substantial risk of loss. Please trade responsibly.'
    }
  },
  
  PT: {
    // Navigation
    nav: {
      home: 'Início',
      products: 'Produtos',
      markets: 'Mercados',
      trading: 'Trading',
      earn: 'Ganhos',
      institutional: 'Institucional',
      cryptoAtm: 'Crypto ATM',
      whyUs: 'Porquê Nós',
      regions: 'Regiões',
      contact: 'Contacto',
      requestAccess: 'Solicitar Acesso',
      login: 'Entrar',
      profile: 'Perfil'
    },
    
    // Auth
    auth: {
      welcomeBack: 'Bem-vindo de Volta',
      createAccount: 'Criar Conta',
      loginDescription: 'Entre para aceder à sua conta',
      registerDescription: 'Junte-se à nossa plataforma exclusiva',
      fullName: 'Nome Completo',
      email: 'Email',
      password: 'Palavra-passe',
      phone: 'Número de Telefone',
      country: 'País',
      selectCountry: 'Selecione o seu país',
      signIn: 'Entrar',
      signUp: 'Registar',
      processing: 'A processar...',
      noAccount: 'Não tem conta?',
      haveAccount: 'Já tem conta?',
      backToHome: 'Voltar ao Início',
      loginSuccess: 'Login com sucesso!',
      registerSuccess: 'Conta criada com sucesso!',
      logoutSuccess: 'Sessão terminada com sucesso!',
      logout: 'Sair'
    },
    
    // Profile
    profile: {
      backToHome: 'Voltar ao Início',
      edit: 'Editar Perfil',
      fullName: 'Nome Completo',
      email: 'Email',
      phone: 'Número de Telefone',
      country: 'País',
      selectCountry: 'Selecione o seu país',
      memberSince: 'Membro Desde',
      verified: 'Membro Verificado',
      notProvided: 'Não fornecido',
      cannotChange: 'Não pode ser alterado',
      updateSuccess: 'Perfil atualizado com sucesso!'
    },
    
    // Common
    common: {
      save: 'Guardar',
      saving: 'A guardar...',
      cancel: 'Cancelar'
    },
    
    // Hero Section
    hero: {
      badge: 'ACESSO EXCLUSIVO • NÍVEL INSTITUCIONAL',
      title: 'A Exchange Boutique para',
      subtitle: 'Investidores Sofisticados',
      description: 'Serviços exclusivos de criptomoedas personalizados para indivíduos de alto património e clientes institucionais na Europa, Médio Oriente e Brasil.',
      ctaPrimary: 'Solicitar Acesso',
      ctaSecondary: 'Saber Mais',
      trustLicensed: 'Licenciada & Regulada',
      trustSecurity: 'Segurança Bancária',
      trustAuc: '+$2.5B AUC'
    },
    
    // Products Section
    products: {
      badge: 'Serviços Premium',
      title: 'Personalizado para',
      titleHighlight: 'Clientes Excepcionais',
      description: 'Quatro pilares de excelência desenhados exclusivamente para investidores institucionais e de alto património',
      items: [
        {
          title: 'Exchange Premium',
          description: 'Mesa de negociação OTC white-glove com gestores de relacionamento dedicados. Execute negociações de grande volume com liquidez institucional e discrição.',
          features: ['Suporte Dedicado 24/7', 'Liquidez Institucional', 'Melhor Execução Garantida']
        },
        {
          title: 'Rede Crypto ATM',
          description: 'Rede curada de ATMs crypto premium em localizações exclusivas. Conversões fiat-para-crypto sem fricção com privacidade e conveniência melhoradas.',
          features: ['Localizações Premium', 'Privacidade Melhorada', 'Suporte Multi-Moeda']
        },
        {
          title: 'Launchpad Exclusivo',
          description: 'Acesso antecipado a projetos blockchain verificados e vendas de tokens. Participe em oportunidades pré-verificadas indisponíveis para investidores de retalho.',
          features: ['Apenas Projetos Verificados', 'Acesso Antecipado', 'Relatórios de Due Diligence']
        },
        {
          title: 'Custódia Institucional',
          description: 'Segurança de nível militar com cold storage multi-assinatura. Seguro e conformidade de nível bancário para tranquilidade.',
          features: ['Cold Storage', 'Segurança Multi-Sig', 'Ativos Segurados']
        }
      ]
    },
    
    // Trust Section
    trust: {
      title: 'Porquê a Elite',
      titleHighlight: 'Escolhe a KBEX',
      description: 'Padrões intransigentes que nos distinguem no espaço dos ativos digitais',
      regulated: 'Regulada & Conforme',
      regulatedDesc: 'Totalmente licenciada e regulada em jurisdições europeias. Operações conformes com MiCA garantindo certeza legal.',
      security: 'Segurança Bancária',
      securityDesc: 'Infraestrutura de segurança multi-camada com 98% em cold storage. Auditorias de segurança regulares por terceiros.',
      exclusive: 'Serviço Exclusivo',
      exclusiveDesc: 'Plataforma apenas para membros com gestores de relacionamento dedicados. Serviço personalizado para clientes sofisticados.',
      global: 'Alcance Global',
      globalDesc: 'Operações sem fricção na Europa, Médio Oriente e Brasil. Presença local com capacidades globais.',
      stats: {
        auc: '+$2.5B',
        aucLabel: 'Ativos Sob Custódia',
        clients: '+500',
        clientsLabel: 'Clientes Institucionais',
        uptime: '99.9%',
        uptimeLabel: 'Uptime da Plataforma',
        support: '24/7',
        supportLabel: 'Suporte Dedicado'
      }
    },
    
    // Regions Section
    regions: {
      badge: 'Presença Global',
      title: 'Servindo Excelência',
      titleHighlight: 'Em Três Continentes',
      description: 'Experiência local com alcance global - onde precisa de nós, quando precisa de nós',
      europe: 'Europa',
      europeDesc: 'Sede na Suíça com presença nos principais centros financeiros da UE',
      middleEast: 'Médio Oriente',
      middleEastDesc: 'Servindo clientes UHNW no Dubai, Abu Dhabi e Riade',
      brazil: 'Brasil',
      brazilDesc: 'Serviços exclusivos para a crescente economia crypto da América Latina'
    },
    
    // Contact Section
    contact: {
      badge: 'Começar',
      title: 'Junte-se ao',
      titleHighlight: 'Círculo Exclusivo',
      description: 'Submeta o seu interesse e a nossa equipa entrará em contacto para discutir como a KBEX pode servir as suas necessidades de ativos digitais.',
      form: {
        fullName: 'Nome Completo',
        email: 'Endereço de Email',
        phone: 'Número de Telefone',
        investmentRange: 'Faixa de Investimento',
        selectRange: 'Selecione a sua faixa',
        range1: '$100K - $500K',
        range2: '$500K - $1M',
        range3: '$1M - $5M',
        range4: '+$5M',
        message: 'Fale-nos das suas necessidades',
        submit: 'Solicitar Acesso',
        disclaimer: 'A sua informação está protegida pela nossa política de privacidade e será usada apenas para avaliar elegibilidade de membro.'
      }
    },
    
    // Dashboard
    dashboard: {
      // Layout
      layout: {
        portfolio: 'Portfólio',
        admin: 'Admin',
        loggedInAs: 'Sessão iniciada como',
        logout: 'Sair'
      },
      // Navigation
      nav: {
        overview: 'Visão Geral',
        wallets: 'Carteiras',
        transactions: 'Transações',
        investments: 'Investimentos',
        roi: 'ROI',
        transparency: 'Transparência',
        kycVerification: 'Verificação KYC',
        adminOverview: 'Admin Visão Geral',
        users: 'Utilizadores',
        kycKyb: 'KYC/KYB',
        opportunities: 'Oportunidades',
        inviteCodes: 'Códigos de Convite'
      },
      // Overview
      overview: {
        welcome: 'Bem-vindo de volta',
        portfolioValue: 'Valor do Portfólio',
        totalAssets: 'Total de Ativos',
        activeInvestments: 'Investimentos Ativos',
        pendingTransactions: 'Pendentes',
        recentActivity: 'Atividade Recente',
        noActivity: 'Sem atividade recente',
        viewAll: 'Ver Tudo'
      },
      // Wallets
      wallets: {
        title: 'As Suas Carteiras',
        subtitle: 'Gerir as suas carteiras de criptomoedas',
        balance: 'Saldo',
        available: 'Disponível',
        pending: 'Pendente',
        address: 'Endereço',
        copyAddress: 'Copiar Endereço',
        deposit: 'Depositar',
        withdraw: 'Levantar',
        noWallets: 'Nenhuma carteira encontrada'
      },
      // Transactions
      transactions: {
        title: 'Histórico de Transações',
        subtitle: 'Ver todas as suas transações',
        type: 'Tipo',
        amount: 'Montante',
        status: 'Estado',
        date: 'Data',
        deposit: 'Depósito',
        withdrawal: 'Levantamento',
        transfer: 'Transferência',
        completed: 'Concluído',
        pending: 'Pendente',
        failed: 'Falhado',
        noTransactions: 'Nenhuma transação encontrada'
      },
      // Investments
      investments: {
        title: 'Oportunidades de Investimento',
        subtitle: 'Explorar opções de investimento disponíveis',
        expectedRoi: 'ROI Esperado',
        duration: 'Duração',
        minInvestment: 'Investimento Mínimo',
        maxInvestment: 'Investimento Máximo',
        riskLevel: 'Nível de Risco',
        status: 'Estado',
        open: 'Aberto',
        closed: 'Fechado',
        invest: 'Investir',
        days: 'dias',
        noOpportunities: 'Nenhuma oportunidade disponível'
      },
      // ROI
      roi: {
        title: 'Retorno do Investimento',
        subtitle: 'Acompanhar o desempenho dos seus investimentos',
        totalInvested: 'Total Investido',
        totalReturns: 'Retornos Totais',
        averageRoi: 'ROI Médio',
        activePositions: 'Posições Ativas',
        performanceChart: 'Gráfico de Desempenho',
        noData: 'Sem dados de investimento disponíveis'
      },
      // Transparency
      transparency: {
        title: 'Transparência de Fundos',
        subtitle: 'Prova de reservas e relatórios de auditoria',
        proofOfReserves: 'Prova de Reservas',
        auditReports: 'Relatórios de Auditoria',
        lastUpdated: 'Última Atualização',
        totalReserves: 'Total de Reservas',
        viewReport: 'Ver Relatório',
        noReports: 'Nenhum relatório disponível'
      }
    },
    
    // KYC
    kyc: {
      // Status Page
      status: {
        title: 'Verificação de Identidade',
        subtitle: 'Complete a verificação KYC/KYB para desbloquear todas as funcionalidades da plataforma',
        kycIndividual: 'KYC Individual',
        forIndividuals: 'Para pessoas físicas',
        kycDescription: 'Verificação de identidade pessoal. Necessário para operações até €15.000/mês.',
        kybBusiness: 'KYB Empresarial',
        forBusinesses: 'Para empresas e instituições',
        kybDescription: 'Verificação empresarial completa. Necessário para operações institucionais e limites superiores.',
        notStarted: 'Não Iniciado',
        inProgress: 'Em Progresso',
        pendingReview: 'Aguardando Revisão',
        approved: 'Aprovado',
        rejected: 'Rejeitado',
        verificationComplete: 'Verificação completa',
        startKyc: 'Iniciar KYC',
        startKyb: 'Iniciar KYB',
        continueVerification: 'Continuar Verificação',
        tryAgain: 'Tentar Novamente',
        estimatedTime: 'A sua verificação está em análise. Tempo estimado: 24-48 horas.',
        estimatedTimeKyb: 'A sua verificação está em análise. Tempo estimado: 2-5 dias úteis.',
        whyVerify: 'Porquê verificar a sua identidade?',
        benefits: [
          'Acesso completo a todas as funcionalidades da plataforma',
          'Limites de transação mais elevados',
          'Proteção contra fraude e acesso não autorizado',
          'Conformidade com regulamentações AML/KYC',
          'Suporte prioritário e atendimento dedicado'
        ],
        documents: {
          idDocument: 'Documento de identificação (Passaporte, CC ou CNH)',
          selfieWithId: 'Selfie com documento',
          proofOfAddress: 'Comprovativo de morada',
          certIncorporation: 'Certidão de constituição',
          articlesAssociation: 'Estatutos sociais',
          directorsUbos: 'Identificação dos diretores e UBOs'
        }
      },
      // KYC Form
      form: {
        title: 'Verificação KYC',
        subtitle: 'Complete todos os passos para verificar a sua identidade',
        back: 'Voltar',
        continue: 'Continuar',
        submit: 'Submeter KYC',
        saveInfo: 'Guardar Informação',
        steps: {
          personalInfo: 'Dados Pessoais',
          idDocument: 'Documento ID',
          selfie: 'Selfie',
          proofAddress: 'Morada'
        },
        personalInfo: {
          fullName: 'Nome Completo',
          dateOfBirth: 'Data de Nascimento',
          nationality: 'Nacionalidade',
          countryResidence: 'País de Residência',
          address: 'Morada',
          city: 'Cidade',
          postalCode: 'Código Postal'
        },
        idDocument: {
          documentType: 'Tipo de Documento',
          passport: 'Passaporte',
          idCard: 'Cartão de Cidadão',
          driversLicense: 'Carta de Condução',
          documentNumber: 'Número do Documento',
          expiryDate: 'Data de Validade',
          issuingCountry: 'País de Emissão',
          uploadDocument: 'Carregar Documento',
          frontDocument: 'Frente do Documento'
        },
        selfie: {
          title: 'Instruções para a Selfie',
          instructions: [
            'Segure o documento ao lado do rosto',
            'Certifique-se que ambos estão claramente visíveis',
            'Boa iluminação, sem reflexos ou sombras',
            'Não use óculos de sol ou chapéu'
          ],
          selfieWithId: 'Selfie com Documento'
        },
        address: {
          acceptedDocs: 'Documentos Aceites',
          docsList: [
            'Fatura de serviços (água, luz, gás, internet)',
            'Extrato bancário',
            'Documento fiscal oficial',
            'Deve ter menos de 3 meses'
          ],
          proofOfAddress: 'Comprovativo de Morada'
        },
        upload: {
          dragDrop: 'Arraste um ficheiro ou clique para selecionar',
          formats: 'Formatos: JPG, PNG, PDF (máx. 10MB)',
          uploadSuccess: 'Documento carregado com sucesso',
          upload: 'Carregar'
        }
      },
      // KYB Form
      kybForm: {
        title: 'Verificação KYB Empresarial',
        subtitle: 'Complete todos os passos para verificar a sua empresa',
        steps: {
          companyInfo: 'Dados da Empresa',
          documents: 'Documentos',
          representatives: 'Representantes',
          addressProof: 'Comprovativo'
        },
        companyInfo: {
          companyName: 'Nome da Empresa',
          companyType: 'Tipo de Empresa',
          llc: 'Sociedade por Quotas (Lda)',
          corporation: 'Sociedade Anónima (SA)',
          partnership: 'Sociedade em Nome Colectivo',
          soleProprietorship: 'Empresário em Nome Individual',
          nonProfit: 'Associação/Fundação',
          other: 'Outro',
          registrationNumber: 'NIPC',
          taxId: 'NIF (se diferente)',
          incorporationDate: 'Data de Constituição',
          incorporationCountry: 'País de Constituição',
          headquartersAddress: 'Endereço da Sede',
          businessAddress: 'Morada',
          businessCity: 'Cidade',
          businessPostalCode: 'Código Postal',
          businessCountry: 'País',
          contacts: 'Contactos',
          corporateEmail: 'Email Corporativo',
          phone: 'Telefone',
          website: 'Website'
        },
        documents: {
          requiredDocs: 'Documentos Necessários',
          docsList: [
            'Certidão permanente ou certidão de constituição',
            'Pacto social / Estatutos',
            'Registo de quotistas/acionistas'
          ],
          certIncorporation: 'Certidão de Constituição',
          articlesAssociation: 'Estatutos / Pacto Social',
          shareholderRegister: 'Registo de Quotistas'
        },
        representatives: {
          title: 'Representantes Legais',
          description: 'Adicione todos os diretores e beneficiários efetivos (UBOs) com participação superior a 25%.',
          addedReps: 'Representantes Adicionados',
          addRepresentative: 'Adicionar Representante',
          fullName: 'Nome Completo',
          role: 'Cargo',
          dateOfBirth: 'Data de Nascimento',
          nationality: 'Nacionalidade',
          ownershipPercentage: '% Participação',
          isUbo: 'Beneficiário Efetivo (UBO)',
          add: 'Adicionar Representante'
        },
        addressProof: {
          title: 'Comprovativo de Morada da Sede',
          docsList: [
            'Fatura de serviços em nome da empresa',
            'Extrato bancário empresarial',
            'Documento oficial com morada da sede',
            'Deve ter menos de 3 meses'
          ],
          businessProof: 'Comprovativo de Morada Empresarial',
          taxRegistration: 'Registo Fiscal (opcional)'
        },
        submit: 'Submeter KYB'
      },
      // Admin KYC
      admin: {
        title: 'Verificações KYC/KYB',
        subtitle: 'Revise e aprove pedidos de verificação de identidade',
        searchPlaceholder: 'Pesquisar por nome ou email...',
        pending: 'Pendentes',
        kycPending: 'KYC Pendentes',
        kybPending: 'KYB Pendentes',
        approvedToday: 'Aprovados Hoje',
        noKycPending: 'Nenhuma verificação KYC pendente',
        noKybPending: 'Nenhuma verificação KYB pendente',
        allProcessed: 'Todas as verificações foram processadas',
        personalData: 'Dados Pessoais',
        companyData: 'Dados da Empresa',
        idDocument: 'Documento de Identificação',
        representatives: 'Representantes',
        submittedDocuments: 'Documentos Submetidos',
        noDocuments: 'Nenhum documento encontrado',
        rejectionReason: 'Motivo da rejeição (obrigatório para rejeitar)',
        rejectionPlaceholder: 'Ex: Documento ilegível, dados inconsistentes...',
        reject: 'Rejeitar',
        approve: 'Aprovar',
        docs: 'docs',
        name: 'Nome',
        dob: 'Data Nascimento',
        nationalityLabel: 'Nacionalidade',
        countryResidence: 'País Residência',
        addressLabel: 'Morada',
        cityLabel: 'Cidade',
        company: 'Empresa',
        type: 'Tipo',
        nipc: 'NIPC',
        incorporationDateLabel: 'Data Constituição',
        countryLabel: 'País',
        emailLabel: 'Email',
        documentType: 'Tipo',
        documentNumber: 'Número',
        validity: 'Validade',
        issuingCountryLabel: 'País Emissão'
      }
    },
    
    // Footer
    footer: {
      tagline: 'A exchange boutique para investidores sofisticados.',
      company: 'Empresa',
      about: 'Sobre Nós',
      careers: 'Carreiras',
      press: 'Imprensa',
      legal: 'Legal',
      services: 'Serviços',
      exchange: 'Exchange',
      atmNetwork: 'Rede ATM',
      launchpad: 'Launchpad',
      custody: 'Custódia',
      support: 'Suporte',
      helpCenter: 'Centro de Ajuda',
      contactUs: 'Contacte-nos',
      status: 'Estado do Sistema',
      security: 'Segurança',
      copyright: '© 2025 KBEX.io. Todos os direitos reservados.',
      disclaimer: 'A negociação de criptomoedas envolve risco substancial de perda. Por favor negoceie com responsabilidade.'
    }
  },
  
  AR: {
    // Navigation
    nav: {
      home: 'الرئيسية',
      products: 'المنتجات',
      markets: 'الأسواق',
      trading: 'التداول',
      earn: 'الأرباح',
      institutional: 'المؤسسي',
      cryptoAtm: 'صراف العملات المشفرة',
      whyUs: 'لماذا نحن',
      regions: 'المناطق',
      contact: 'اتصل بنا',
      requestAccess: 'طلب الوصول',
      login: 'تسجيل الدخول',
      profile: 'الملف الشخصي'
    },
    
    // Auth
    auth: {
      welcomeBack: 'مرحباً بعودتك',
      createAccount: 'إنشاء حساب',
      loginDescription: 'سجل الدخول للوصول إلى حسابك',
      registerDescription: 'انضم إلى منصتنا الحصرية',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      phone: 'رقم الهاتف',
      country: 'البلد',
      selectCountry: 'اختر بلدك',
      signIn: 'تسجيل الدخول',
      signUp: 'إنشاء حساب',
      processing: 'جاري المعالجة...',
      noAccount: 'ليس لديك حساب؟',
      haveAccount: 'لديك حساب بالفعل؟',
      backToHome: 'العودة للرئيسية',
      loginSuccess: 'تم تسجيل الدخول بنجاح!',
      registerSuccess: 'تم إنشاء الحساب بنجاح!',
      logoutSuccess: 'تم تسجيل الخروج بنجاح!',
      logout: 'تسجيل الخروج'
    },
    
    // Profile
    profile: {
      backToHome: 'العودة للرئيسية',
      edit: 'تعديل الملف الشخصي',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      country: 'البلد',
      selectCountry: 'اختر بلدك',
      memberSince: 'عضو منذ',
      verified: 'عضو موثق',
      notProvided: 'غير متوفر',
      cannotChange: 'لا يمكن تغييره',
      updateSuccess: 'تم تحديث الملف الشخصي بنجاح!'
    },
    
    // Common
    common: {
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      cancel: 'إلغاء'
    },
    
    // Hero Section
    hero: {
      badge: 'وصول حصري • درجة مؤسسية',
      title: 'منصة التداول الفاخرة',
      subtitle: 'للمستثمرين المتميزين',
      description: 'خدمات العملات المشفرة الحصرية المصممة للأفراد ذوي الملاءة المالية العالية والعملاء المؤسسيين في أوروبا والشرق الأوسط والبرازيل.',
      ctaPrimary: 'طلب الوصول',
      ctaSecondary: 'معرفة المزيد',
      trustLicensed: 'مرخصة ومنظمة',
      trustSecurity: 'أمان بمستوى البنوك',
      trustAuc: '+2.5 مليار دولار'
    },
    
    // Products Section
    products: {
      badge: 'خدمات متميزة',
      title: 'مصممة خصيصاً',
      titleHighlight: 'للعملاء المتميزين',
      description: 'أربعة ركائز من التميز مصممة حصرياً للمستثمرين المؤسسيين وذوي الملاءة المالية العالية',
      items: [
        {
          title: 'منصة التداول المتميزة',
          description: 'مكتب تداول OTC متميز مع مديري علاقات مخصصين. تنفيذ صفقات كبيرة الحجم بسيولة مؤسسية وسرية.',
          features: ['دعم مخصص 24/7', 'سيولة مؤسسية', 'أفضل تنفيذ مضمون']
        },
        {
          title: 'شبكة صرافات العملات المشفرة',
          description: 'شبكة منتقاة من صرافات العملات المشفرة في مواقع حصرية. تحويلات سلسة من العملات الورقية إلى المشفرة.',
          features: ['مواقع متميزة', 'خصوصية محسنة', 'دعم متعدد العملات']
        },
        {
          title: 'منصة الإطلاق الحصرية',
          description: 'وصول مبكر لمشاريع البلوكتشين المختارة وبيع التوكنات. المشاركة في فرص غير متاحة لمستثمري التجزئة.',
          features: ['مشاريع موثقة فقط', 'وصول مبكر', 'تقارير العناية الواجبة']
        },
        {
          title: 'الحفظ المؤسسي',
          description: 'أمان بمستوى عسكري مع تخزين بارد متعدد التوقيع. تأمين ومطابقة بمستوى البنوك لراحة البال.',
          features: ['تخزين بارد', 'أمان متعدد التوقيع', 'أصول مؤمنة']
        }
      ]
    },
    
    // Trust Section
    trust: {
      title: 'لماذا يختار النخبة',
      titleHighlight: 'كريبتوبوكس',
      description: 'معايير لا هوادة فيها تميزنا في مجال الأصول الرقمية',
      regulated: 'منظمة ومتوافقة',
      regulatedDesc: 'مرخصة ومنظمة بالكامل عبر الولايات القضائية الأوروبية. عمليات متوافقة مع MiCA.',
      security: 'أمان بمستوى البنوك',
      securityDesc: 'بنية أمان متعددة الطبقات مع 98% تخزين بارد. تدقيق أمني منتظم من طرف ثالث.',
      exclusive: 'خدمة حصرية',
      exclusiveDesc: 'منصة للأعضاء فقط مع مديري علاقات مخصصين. خدمة شخصية للعملاء المتميزين.',
      global: 'انتشار عالمي',
      globalDesc: 'عمليات سلسة عبر أوروبا والشرق الأوسط والبرازيل.',
      stats: {
        auc: '+2.5 مليار',
        aucLabel: 'الأصول تحت الحفظ',
        clients: '+500',
        clientsLabel: 'عميل مؤسسي',
        uptime: '99.9%',
        uptimeLabel: 'وقت تشغيل المنصة',
        support: '24/7',
        supportLabel: 'دعم مخصص'
      }
    },
    
    // Regions Section
    regions: {
      badge: 'حضور عالمي',
      title: 'نقدم التميز',
      titleHighlight: 'عبر ثلاث قارات',
      description: 'خبرة محلية مع انتشار عالمي - حيث تحتاجنا، عندما تحتاجنا',
      europe: 'أوروبا',
      europeDesc: 'المقر الرئيسي في سويسرا مع تواجد في المراكز المالية الأوروبية',
      middleEast: 'الشرق الأوسط',
      middleEastDesc: 'نخدم عملاء UHNW في دبي وأبوظبي والرياض',
      brazil: 'البرازيل',
      brazilDesc: 'خدمات حصرية لاقتصاد العملات المشفرة المتنامي في أمريكا اللاتينية'
    },
    
    // Contact Section
    contact: {
      badge: 'ابدأ الآن',
      title: 'انضم إلى',
      titleHighlight: 'الدائرة الحصرية',
      description: 'قدم اهتمامك وسيتواصل معك فريقنا لمناقشة كيف يمكن لكريبتوبوكس خدمة احتياجاتك.',
      form: {
        fullName: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        phone: 'رقم الهاتف',
        investmentRange: 'نطاق الاستثمار',
        selectRange: 'اختر النطاق',
        range1: '$100K - $500K',
        range2: '$500K - $1M',
        range3: '$1M - $5M',
        range4: '+$5M',
        message: 'أخبرنا عن احتياجاتك',
        submit: 'طلب الوصول',
        disclaimer: 'معلوماتك محمية بسياسة الخصوصية الخاصة بنا وستستخدم فقط لتقييم أهلية العضوية.'
      }
    },
    
    // Dashboard
    dashboard: {
      layout: {
        portfolio: 'المحفظة',
        admin: 'الإدارة',
        loggedInAs: 'تم تسجيل الدخول كـ',
        logout: 'تسجيل الخروج'
      },
      nav: {
        overview: 'نظرة عامة',
        wallets: 'المحافظ',
        transactions: 'المعاملات',
        investments: 'الاستثمارات',
        roi: 'العائد على الاستثمار',
        transparency: 'الشفافية',
        kycVerification: 'التحقق من الهوية',
        adminOverview: 'نظرة عامة للإدارة',
        users: 'المستخدمين',
        kycKyb: 'KYC/KYB',
        opportunities: 'الفرص',
        inviteCodes: 'أكواد الدعوة'
      },
      overview: {
        welcome: 'مرحباً بعودتك',
        portfolioValue: 'قيمة المحفظة',
        totalAssets: 'إجمالي الأصول',
        activeInvestments: 'الاستثمارات النشطة',
        pendingTransactions: 'قيد الانتظار',
        recentActivity: 'النشاط الأخير',
        noActivity: 'لا يوجد نشاط حديث',
        viewAll: 'عرض الكل'
      },
      wallets: {
        title: 'محافظك',
        subtitle: 'إدارة محافظ العملات المشفرة',
        balance: 'الرصيد',
        available: 'المتاح',
        pending: 'قيد الانتظار',
        address: 'العنوان',
        copyAddress: 'نسخ العنوان',
        deposit: 'إيداع',
        withdraw: 'سحب',
        noWallets: 'لم يتم العثور على محافظ'
      },
      transactions: {
        title: 'سجل المعاملات',
        subtitle: 'عرض جميع معاملاتك',
        type: 'النوع',
        amount: 'المبلغ',
        status: 'الحالة',
        date: 'التاريخ',
        deposit: 'إيداع',
        withdrawal: 'سحب',
        transfer: 'تحويل',
        completed: 'مكتمل',
        pending: 'قيد الانتظار',
        failed: 'فشل',
        noTransactions: 'لم يتم العثور على معاملات'
      },
      investments: {
        title: 'فرص الاستثمار',
        subtitle: 'استكشاف خيارات الاستثمار المتاحة',
        expectedRoi: 'العائد المتوقع',
        duration: 'المدة',
        minInvestment: 'الحد الأدنى للاستثمار',
        maxInvestment: 'الحد الأقصى للاستثمار',
        riskLevel: 'مستوى المخاطر',
        status: 'الحالة',
        open: 'مفتوح',
        closed: 'مغلق',
        invest: 'استثمار',
        days: 'أيام',
        noOpportunities: 'لا توجد فرص متاحة'
      },
      roi: {
        title: 'العائد على الاستثمار',
        subtitle: 'تتبع أداء استثماراتك',
        totalInvested: 'إجمالي المستثمر',
        totalReturns: 'إجمالي العوائد',
        averageRoi: 'متوسط العائد',
        activePositions: 'المراكز النشطة',
        performanceChart: 'مخطط الأداء',
        noData: 'لا تتوفر بيانات استثمارية'
      },
      transparency: {
        title: 'شفافية الصندوق',
        subtitle: 'إثبات الاحتياطيات وتقارير التدقيق',
        proofOfReserves: 'إثبات الاحتياطيات',
        auditReports: 'تقارير التدقيق',
        lastUpdated: 'آخر تحديث',
        totalReserves: 'إجمالي الاحتياطيات',
        viewReport: 'عرض التقرير',
        noReports: 'لا توجد تقارير متاحة'
      }
    },
    
    // KYC
    kyc: {
      status: {
        title: 'التحقق من الهوية',
        subtitle: 'أكمل التحقق من KYC/KYB لفتح جميع ميزات المنصة',
        kycIndividual: 'KYC فردي',
        forIndividuals: 'للأفراد',
        kycDescription: 'التحقق من الهوية الشخصية. مطلوب للعمليات حتى 15,000 يورو شهرياً.',
        kybBusiness: 'KYB للأعمال',
        forBusinesses: 'للشركات والمؤسسات',
        kybDescription: 'التحقق الكامل من الأعمال. مطلوب للعمليات المؤسسية والحدود الأعلى.',
        notStarted: 'لم يبدأ',
        inProgress: 'قيد التقدم',
        pendingReview: 'في انتظار المراجعة',
        approved: 'موافق عليه',
        rejected: 'مرفوض',
        verificationComplete: 'اكتمل التحقق',
        startKyc: 'بدء KYC',
        startKyb: 'بدء KYB',
        continueVerification: 'متابعة التحقق',
        tryAgain: 'حاول مرة أخرى',
        estimatedTime: 'التحقق قيد المراجعة. الوقت المقدر: 24-48 ساعة.',
        estimatedTimeKyb: 'التحقق قيد المراجعة. الوقت المقدر: 2-5 أيام عمل.',
        whyVerify: 'لماذا تتحقق من هويتك؟',
        benefits: [
          'وصول كامل لجميع ميزات المنصة',
          'حدود معاملات أعلى',
          'حماية من الاحتيال والوصول غير المصرح به',
          'الامتثال للوائح مكافحة غسل الأموال',
          'دعم ذو أولوية وخدمة مخصصة'
        ],
        documents: {
          idDocument: 'وثيقة الهوية (جواز السفر، بطاقة الهوية، أو رخصة القيادة)',
          selfieWithId: 'صورة شخصية مع الوثيقة',
          proofOfAddress: 'إثبات العنوان',
          certIncorporation: 'شهادة التأسيس',
          articlesAssociation: 'النظام الأساسي',
          directorsUbos: 'تحديد المديرين والمستفيدين النهائيين'
        }
      },
      form: {
        title: 'التحقق من KYC',
        subtitle: 'أكمل جميع الخطوات للتحقق من هويتك',
        back: 'رجوع',
        continue: 'متابعة',
        submit: 'إرسال KYC',
        saveInfo: 'حفظ المعلومات',
        steps: {
          personalInfo: 'المعلومات الشخصية',
          idDocument: 'وثيقة الهوية',
          selfie: 'صورة شخصية',
          proofAddress: 'العنوان'
        },
        personalInfo: {
          fullName: 'الاسم الكامل',
          dateOfBirth: 'تاريخ الميلاد',
          nationality: 'الجنسية',
          countryResidence: 'بلد الإقامة',
          address: 'العنوان',
          city: 'المدينة',
          postalCode: 'الرمز البريدي'
        },
        idDocument: {
          documentType: 'نوع الوثيقة',
          passport: 'جواز السفر',
          idCard: 'بطاقة الهوية',
          driversLicense: 'رخصة القيادة',
          documentNumber: 'رقم الوثيقة',
          expiryDate: 'تاريخ الانتهاء',
          issuingCountry: 'بلد الإصدار',
          uploadDocument: 'رفع الوثيقة',
          frontDocument: 'الوجه الأمامي للوثيقة'
        },
        selfie: {
          title: 'تعليمات الصورة الشخصية',
          instructions: [
            'أمسك الوثيقة بجانب وجهك',
            'تأكد من أن كليهما مرئيان بوضوح',
            'إضاءة جيدة، بدون انعكاسات أو ظلال',
            'لا ترتدِ نظارات شمسية أو قبعة'
          ],
          selfieWithId: 'صورة شخصية مع الوثيقة'
        },
        address: {
          acceptedDocs: 'الوثائق المقبولة',
          docsList: [
            'فاتورة خدمات (ماء، كهرباء، غاز، إنترنت)',
            'كشف حساب بنكي',
            'وثيقة ضريبية رسمية',
            'يجب أن تكون أقل من 3 أشهر'
          ],
          proofOfAddress: 'إثبات العنوان'
        },
        upload: {
          dragDrop: 'اسحب ملفاً أو انقر للاختيار',
          formats: 'الصيغ: JPG، PNG، PDF (الحد الأقصى 10 ميجا)',
          uploadSuccess: 'تم رفع الوثيقة بنجاح',
          upload: 'رفع'
        }
      },
      kybForm: {
        title: 'التحقق من KYB للأعمال',
        subtitle: 'أكمل جميع الخطوات للتحقق من شركتك',
        steps: {
          companyInfo: 'معلومات الشركة',
          documents: 'الوثائق',
          representatives: 'الممثلون',
          addressProof: 'الإثبات'
        },
        companyInfo: {
          companyName: 'اسم الشركة',
          companyType: 'نوع الشركة',
          llc: 'شركة ذات مسؤولية محدودة',
          corporation: 'شركة مساهمة',
          partnership: 'شراكة',
          soleProprietorship: 'مؤسسة فردية',
          nonProfit: 'منظمة غير ربحية',
          other: 'أخرى',
          registrationNumber: 'رقم التسجيل',
          taxId: 'الرقم الضريبي (إن كان مختلفاً)',
          incorporationDate: 'تاريخ التأسيس',
          incorporationCountry: 'بلد التأسيس',
          headquartersAddress: 'عنوان المقر الرئيسي',
          businessAddress: 'عنوان العمل',
          businessCity: 'المدينة',
          businessPostalCode: 'الرمز البريدي',
          businessCountry: 'البلد',
          contacts: 'جهات الاتصال',
          corporateEmail: 'البريد الإلكتروني للشركة',
          phone: 'الهاتف',
          website: 'الموقع الإلكتروني'
        },
        documents: {
          requiredDocs: 'الوثائق المطلوبة',
          docsList: [
            'شهادة التأسيس',
            'النظام الأساسي / اللوائح',
            'سجل المساهمين'
          ],
          certIncorporation: 'شهادة التأسيس',
          articlesAssociation: 'النظام الأساسي / اللوائح',
          shareholderRegister: 'سجل المساهمين'
        },
        representatives: {
          title: 'الممثلون القانونيون',
          description: 'أضف جميع المديرين والمستفيدين النهائيين (UBOs) بملكية تزيد عن 25٪.',
          addedReps: 'الممثلون المضافون',
          addRepresentative: 'إضافة ممثل',
          fullName: 'الاسم الكامل',
          role: 'المنصب',
          dateOfBirth: 'تاريخ الميلاد',
          nationality: 'الجنسية',
          ownershipPercentage: 'نسبة الملكية',
          isUbo: 'المستفيد النهائي (UBO)',
          add: 'إضافة ممثل'
        },
        addressProof: {
          title: 'إثبات عنوان العمل',
          docsList: [
            'فاتورة خدمات باسم الشركة',
            'كشف حساب بنكي للشركة',
            'وثيقة رسمية بعنوان المقر',
            'يجب أن تكون أقل من 3 أشهر'
          ],
          businessProof: 'إثبات عنوان العمل',
          taxRegistration: 'التسجيل الضريبي (اختياري)'
        },
        submit: 'إرسال KYB'
      },
      admin: {
        title: 'التحقق من KYC/KYB',
        subtitle: 'مراجعة واعتماد طلبات التحقق من الهوية',
        searchPlaceholder: 'البحث بالاسم أو البريد الإلكتروني...',
        pending: 'قيد الانتظار',
        kycPending: 'KYC قيد الانتظار',
        kybPending: 'KYB قيد الانتظار',
        approvedToday: 'تمت الموافقة اليوم',
        noKycPending: 'لا توجد تحقيقات KYC قيد الانتظار',
        noKybPending: 'لا توجد تحقيقات KYB قيد الانتظار',
        allProcessed: 'تمت معالجة جميع التحقيقات',
        personalData: 'البيانات الشخصية',
        companyData: 'بيانات الشركة',
        idDocument: 'وثيقة الهوية',
        representatives: 'الممثلون',
        submittedDocuments: 'الوثائق المقدمة',
        noDocuments: 'لم يتم العثور على وثائق',
        rejectionReason: 'سبب الرفض (مطلوب للرفض)',
        rejectionPlaceholder: 'مثال: وثيقة غير مقروءة، بيانات متناقضة...',
        reject: 'رفض',
        approve: 'موافقة',
        docs: 'وثائق',
        name: 'الاسم',
        dob: 'تاريخ الميلاد',
        nationalityLabel: 'الجنسية',
        countryResidence: 'بلد الإقامة',
        addressLabel: 'العنوان',
        cityLabel: 'المدينة',
        company: 'الشركة',
        type: 'النوع',
        nipc: 'رقم التسجيل',
        incorporationDateLabel: 'تاريخ التأسيس',
        countryLabel: 'البلد',
        emailLabel: 'البريد الإلكتروني',
        documentType: 'النوع',
        documentNumber: 'الرقم',
        validity: 'الصلاحية',
        issuingCountryLabel: 'بلد الإصدار'
      }
    },
    
    // Footer
    footer: {
      tagline: 'منصة التداول الفاخرة للمستثمرين المتميزين.',
      company: 'الشركة',
      about: 'عن الشركة',
      careers: 'الوظائف',
      press: 'الصحافة',
      legal: 'القانونية',
      services: 'الخدمات',
      exchange: 'المنصة',
      atmNetwork: 'شبكة الصرافات',
      launchpad: 'منصة الإطلاق',
      custody: 'الحفظ',
      support: 'الدعم',
      helpCenter: 'مركز المساعدة',
      contactUs: 'اتصل بنا',
      status: 'حالة النظام',
      security: 'الأمان',
      copyright: '© 2025 كريبتوبوكس. جميع الحقوق محفوظة.',
      disclaimer: 'تداول العملات المشفرة ينطوي على مخاطر كبيرة. يرجى التداول بمسؤولية.'
    }
  }
};

export default translations;

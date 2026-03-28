"""
Backend Internationalization (i18n)
Supports: EN (English), PT (Portuguese), AR (Arabic)
"""

# Backend translations for API responses and error messages
translations = {
    "EN": {
        # Authentication
        "auth": {
            "invalid_credentials": "Invalid email or password",
            "user_not_found": "User not found",
            "email_already_exists": "Email already registered",
            "password_too_short": "Password must be at least 8 characters",
            "invalid_token": "Invalid or expired token",
            "account_disabled": "Account is disabled",
            "account_pending": "Account pending approval",
            "login_success": "Login successful",
            "logout_success": "Logout successful",
            "registration_success": "Registration successful",
            "password_changed": "Password changed successfully",
            "password_reset_sent": "Password reset email sent",
            "invalid_reset_token": "Invalid or expired reset token",
            "account_deactivated": "Account deactivated successfully",
        },
        
        # 2FA
        "2fa": {
            "setup_success": "2FA setup initiated",
            "verify_success": "2FA enabled successfully",
            "disable_success": "2FA disabled successfully",
            "invalid_code": "Invalid verification code",
            "already_enabled": "2FA is already enabled",
            "not_enabled": "2FA is not enabled",
            "code_required": "Verification code required",
        },
        
        # KYC
        "kyc": {
            "submission_success": "KYC submitted successfully",
            "already_submitted": "KYC already submitted",
            "approved": "KYC approved",
            "rejected": "KYC rejected",
            "pending": "KYC pending review",
            "document_required": "Document is required",
            "invalid_document": "Invalid document format",
        },
        
        # Trading
        "trading": {
            "order_created": "Order created successfully",
            "order_cancelled": "Order cancelled",
            "order_executed": "Order executed",
            "insufficient_balance": "Insufficient balance",
            "invalid_amount": "Invalid amount",
            "invalid_price": "Invalid price",
            "market_closed": "Market is closed",
            "minimum_not_met": "Minimum order amount not met",
            "maximum_exceeded": "Maximum order amount exceeded",
            "daily_limit_exceeded": "Daily limit exceeded",
        },
        
        # Wallets
        "wallet": {
            "created": "Wallet created successfully",
            "deposit_success": "Deposit successful",
            "withdrawal_success": "Withdrawal request submitted",
            "withdrawal_pending": "Withdrawal pending approval",
            "withdrawal_approved": "Withdrawal approved",
            "withdrawal_rejected": "Withdrawal rejected",
            "address_invalid": "Invalid wallet address",
            "amount_invalid": "Invalid amount",
        },
        
        # OTC
        "otc": {
            "lead_created": "Lead created successfully",
            "client_created": "Client created successfully",
            "deal_created": "Deal created successfully",
            "quote_created": "Quote created and sent",
            "quote_accepted": "Quote accepted",
            "quote_rejected": "Quote rejected",
            "quote_expired": "Quote has expired",
            "rfq_submitted": "RFQ submitted successfully",
        },
        
        # General
        "general": {
            "success": "Success",
            "error": "An error occurred",
            "not_found": "Not found",
            "unauthorized": "Unauthorized access",
            "forbidden": "Access forbidden",
            "bad_request": "Bad request",
            "server_error": "Internal server error",
            "validation_error": "Validation error",
            "created": "Created successfully",
            "updated": "Updated successfully",
            "deleted": "Deleted successfully",
        },
        
        # Admin
        "admin": {
            "user_approved": "User approved successfully",
            "user_rejected": "User rejected",
            "user_suspended": "User suspended",
            "settings_updated": "Settings updated successfully",
            "transfer_approved": "Transfer approved",
            "transfer_rejected": "Transfer rejected",
        },
        
        # Notifications
        "notifications": {
            "new_user": "New user registration",
            "kyc_submitted": "New KYC submission",
            "deposit_received": "Deposit received",
            "withdrawal_request": "New withdrawal request",
            "new_order": "New order placed",
            "new_ticket": "New support ticket",
        },
    },
    
    "PT": {
        # Authentication
        "auth": {
            "invalid_credentials": "Email ou senha inválidos",
            "user_not_found": "Utilizador não encontrado",
            "email_already_exists": "Email já registado",
            "password_too_short": "A senha deve ter pelo menos 8 caracteres",
            "invalid_token": "Token inválido ou expirado",
            "account_disabled": "Conta desativada",
            "account_pending": "Conta pendente de aprovação",
            "login_success": "Login efetuado com sucesso",
            "logout_success": "Logout efetuado com sucesso",
            "registration_success": "Registo efetuado com sucesso",
            "password_changed": "Senha alterada com sucesso",
            "password_reset_sent": "Email de recuperação enviado",
            "invalid_reset_token": "Token de recuperação inválido ou expirado",
            "account_deactivated": "Conta desativada com sucesso",
        },
        
        # 2FA
        "2fa": {
            "setup_success": "Configuração 2FA iniciada",
            "verify_success": "2FA ativado com sucesso",
            "disable_success": "2FA desativado com sucesso",
            "invalid_code": "Código de verificação inválido",
            "already_enabled": "2FA já está ativo",
            "not_enabled": "2FA não está ativo",
            "code_required": "Código de verificação necessário",
        },
        
        # KYC
        "kyc": {
            "submission_success": "KYC submetido com sucesso",
            "already_submitted": "KYC já foi submetido",
            "approved": "KYC aprovado",
            "rejected": "KYC rejeitado",
            "pending": "KYC em análise",
            "document_required": "Documento obrigatório",
            "invalid_document": "Formato de documento inválido",
        },
        
        # Trading
        "trading": {
            "order_created": "Ordem criada com sucesso",
            "order_cancelled": "Ordem cancelada",
            "order_executed": "Ordem executada",
            "insufficient_balance": "Saldo insuficiente",
            "invalid_amount": "Montante inválido",
            "invalid_price": "Preço inválido",
            "market_closed": "Mercado fechado",
            "minimum_not_met": "Montante mínimo não atingido",
            "maximum_exceeded": "Montante máximo excedido",
            "daily_limit_exceeded": "Limite diário excedido",
        },
        
        # Wallets
        "wallet": {
            "created": "Carteira criada com sucesso",
            "deposit_success": "Depósito efetuado com sucesso",
            "withdrawal_success": "Pedido de levantamento submetido",
            "withdrawal_pending": "Levantamento pendente de aprovação",
            "withdrawal_approved": "Levantamento aprovado",
            "withdrawal_rejected": "Levantamento rejeitado",
            "address_invalid": "Endereço de carteira inválido",
            "amount_invalid": "Montante inválido",
        },
        
        # OTC
        "otc": {
            "lead_created": "Lead criado com sucesso",
            "client_created": "Cliente criado com sucesso",
            "deal_created": "Deal criado com sucesso",
            "quote_created": "Cotação criada e enviada",
            "quote_accepted": "Cotação aceite",
            "quote_rejected": "Cotação rejeitada",
            "quote_expired": "Cotação expirada",
            "rfq_submitted": "RFQ submetido com sucesso",
        },
        
        # General
        "general": {
            "success": "Sucesso",
            "error": "Ocorreu um erro",
            "not_found": "Não encontrado",
            "unauthorized": "Acesso não autorizado",
            "forbidden": "Acesso proibido",
            "bad_request": "Pedido inválido",
            "server_error": "Erro interno do servidor",
            "validation_error": "Erro de validação",
            "created": "Criado com sucesso",
            "updated": "Atualizado com sucesso",
            "deleted": "Eliminado com sucesso",
        },
        
        # Admin
        "admin": {
            "user_approved": "Utilizador aprovado com sucesso",
            "user_rejected": "Utilizador rejeitado",
            "user_suspended": "Utilizador suspenso",
            "settings_updated": "Configurações atualizadas com sucesso",
            "transfer_approved": "Transferência aprovada",
            "transfer_rejected": "Transferência rejeitada",
        },
        
        # Notifications
        "notifications": {
            "new_user": "Novo registo de utilizador",
            "kyc_submitted": "Nova submissão de KYC",
            "deposit_received": "Depósito recebido",
            "withdrawal_request": "Novo pedido de levantamento",
            "new_order": "Nova ordem colocada",
            "new_ticket": "Novo ticket de suporte",
        },
    },
    
    "AR": {
        # Authentication
        "auth": {
            "invalid_credentials": "البريد الإلكتروني أو كلمة المرور غير صالحة",
            "user_not_found": "المستخدم غير موجود",
            "email_already_exists": "البريد الإلكتروني مسجل بالفعل",
            "password_too_short": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل",
            "invalid_token": "رمز غير صالح أو منتهي الصلاحية",
            "account_disabled": "الحساب معطل",
            "account_pending": "الحساب في انتظار الموافقة",
            "login_success": "تم تسجيل الدخول بنجاح",
            "logout_success": "تم تسجيل الخروج بنجاح",
            "registration_success": "تم التسجيل بنجاح",
            "password_changed": "تم تغيير كلمة المرور بنجاح",
            "password_reset_sent": "تم إرسال بريد استعادة كلمة المرور",
            "invalid_reset_token": "رمز الاستعادة غير صالح أو منتهي الصلاحية",
            "account_deactivated": "تم إلغاء تنشيط الحساب بنجاح",
        },
        
        # 2FA
        "2fa": {
            "setup_success": "بدأ إعداد المصادقة الثنائية",
            "verify_success": "تم تفعيل المصادقة الثنائية بنجاح",
            "disable_success": "تم تعطيل المصادقة الثنائية بنجاح",
            "invalid_code": "رمز التحقق غير صالح",
            "already_enabled": "المصادقة الثنائية مفعلة بالفعل",
            "not_enabled": "المصادقة الثنائية غير مفعلة",
            "code_required": "رمز التحقق مطلوب",
        },
        
        # KYC
        "kyc": {
            "submission_success": "تم تقديم التحقق من الهوية بنجاح",
            "already_submitted": "تم تقديم التحقق من الهوية مسبقاً",
            "approved": "تمت الموافقة على التحقق من الهوية",
            "rejected": "تم رفض التحقق من الهوية",
            "pending": "التحقق من الهوية قيد المراجعة",
            "document_required": "المستند مطلوب",
            "invalid_document": "صيغة المستند غير صالحة",
        },
        
        # Trading
        "trading": {
            "order_created": "تم إنشاء الطلب بنجاح",
            "order_cancelled": "تم إلغاء الطلب",
            "order_executed": "تم تنفيذ الطلب",
            "insufficient_balance": "رصيد غير كافٍ",
            "invalid_amount": "المبلغ غير صالح",
            "invalid_price": "السعر غير صالح",
            "market_closed": "السوق مغلق",
            "minimum_not_met": "لم يتم الوصول للحد الأدنى للطلب",
            "maximum_exceeded": "تم تجاوز الحد الأقصى للطلب",
            "daily_limit_exceeded": "تم تجاوز الحد اليومي",
        },
        
        # Wallets
        "wallet": {
            "created": "تم إنشاء المحفظة بنجاح",
            "deposit_success": "تم الإيداع بنجاح",
            "withdrawal_success": "تم تقديم طلب السحب",
            "withdrawal_pending": "السحب في انتظار الموافقة",
            "withdrawal_approved": "تمت الموافقة على السحب",
            "withdrawal_rejected": "تم رفض السحب",
            "address_invalid": "عنوان المحفظة غير صالح",
            "amount_invalid": "المبلغ غير صالح",
        },
        
        # OTC
        "otc": {
            "lead_created": "تم إنشاء العميل المحتمل بنجاح",
            "client_created": "تم إنشاء العميل بنجاح",
            "deal_created": "تم إنشاء الصفقة بنجاح",
            "quote_created": "تم إنشاء وإرسال عرض السعر",
            "quote_accepted": "تم قبول عرض السعر",
            "quote_rejected": "تم رفض عرض السعر",
            "quote_expired": "انتهت صلاحية عرض السعر",
            "rfq_submitted": "تم تقديم طلب عرض السعر بنجاح",
        },
        
        # General
        "general": {
            "success": "نجاح",
            "error": "حدث خطأ",
            "not_found": "غير موجود",
            "unauthorized": "وصول غير مصرح به",
            "forbidden": "الوصول محظور",
            "bad_request": "طلب غير صالح",
            "server_error": "خطأ في الخادم الداخلي",
            "validation_error": "خطأ في التحقق",
            "created": "تم الإنشاء بنجاح",
            "updated": "تم التحديث بنجاح",
            "deleted": "تم الحذف بنجاح",
        },
        
        # Admin
        "admin": {
            "user_approved": "تمت الموافقة على المستخدم بنجاح",
            "user_rejected": "تم رفض المستخدم",
            "user_suspended": "تم تعليق المستخدم",
            "settings_updated": "تم تحديث الإعدادات بنجاح",
            "transfer_approved": "تمت الموافقة على التحويل",
            "transfer_rejected": "تم رفض التحويل",
        },
        
        # Notifications
        "notifications": {
            "new_user": "تسجيل مستخدم جديد",
            "kyc_submitted": "تقديم جديد للتحقق من الهوية",
            "deposit_received": "تم استلام إيداع",
            "withdrawal_request": "طلب سحب جديد",
            "new_order": "تم وضع طلب جديد",
            "new_ticket": "تذكرة دعم جديدة",
        },
    },
}

# Default language
DEFAULT_LANGUAGE = "PT"

def get_translation(key: str, lang: str = None) -> str:
    """
    Get translation for a key.
    Key format: "category.message_key" (e.g., "auth.invalid_credentials")
    """
    if lang is None:
        lang = DEFAULT_LANGUAGE
    
    lang = lang.upper()
    if lang not in translations:
        lang = DEFAULT_LANGUAGE
    
    try:
        parts = key.split(".")
        result = translations[lang]
        for part in parts:
            result = result[part]
        return result
    except (KeyError, TypeError):
        # Fallback to English, then return key
        try:
            result = translations["EN"]
            for part in parts:
                result = result[part]
            return result
        except (KeyError, TypeError):
            return key

def t(key: str, lang: str = None) -> str:
    """Shorthand for get_translation"""
    return get_translation(key, lang)


class I18n:
    """
    Helper class for handling translations in route handlers.
    Use with request headers to get user's preferred language.
    """
    
    @staticmethod
    def get_language_from_header(accept_language: str = None) -> str:
        """Extract language from Accept-Language header"""
        if not accept_language:
            return DEFAULT_LANGUAGE
        
        # Parse Accept-Language header (simplified)
        # Format: "pt-PT,pt;q=0.9,en;q=0.8"
        languages = accept_language.split(",")
        for lang in languages:
            lang_code = lang.split(";")[0].strip().split("-")[0].upper()
            if lang_code in translations:
                return lang_code
        
        return DEFAULT_LANGUAGE
    
    @staticmethod
    def get(key: str, lang: str = None) -> str:
        """Get translation"""
        return get_translation(key, lang)

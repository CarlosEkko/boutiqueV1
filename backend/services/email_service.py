"""
Brevo Email Service
Handles transactional email sending, CRM contact sync, and webhook tracking
"""

import os
import logging
import httpx
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@kbex.io")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "KBEX.io")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_BASE_URL = "https://api.brevo.com/v3"


class BrevoEmailService:
    """Email service using Brevo API for transactional emails."""
    
    def __init__(self):
        self.api_key = BREVO_API_KEY
        self.sender_email = BREVO_SENDER_EMAIL
        self.sender_name = BREVO_SENDER_NAME
    
    # Global email disclaimer - appended to all outgoing emails
    EMAIL_DISCLAIMER = """
<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #333333; font-family: Arial, sans-serif; font-size: 10px; color: #666666; line-height: 1.5;">
<p style="margin: 0 0 8px 0; font-weight: bold; color: #888888;">AVISO LEGAL / DISCLAIMER</p>
<p style="margin: 0 0 6px 0;">Esta mensagem e quaisquer ficheiros anexos são confidenciais e destinam-se exclusivamente ao(s) destinatário(s) indicado(s). Se recebeu esta mensagem por engano, por favor notifique imediatamente o remetente e elimine a mensagem do seu sistema. É proibida a divulgação, cópia ou distribuição desta mensagem sem autorização prévia.</p>
<p style="margin: 0 0 6px 0;">As informações contidas nesta comunicação não constituem aconselhamento financeiro, fiscal ou jurídico. Qualquer referência a ativos digitais, criptomoedas ou instrumentos financeiros é meramente informativa e não deve ser interpretada como uma recomendação de investimento, compra ou venda. O valor dos ativos digitais pode flutuar significativamente e investir envolve risco de perda de capital.</p>
<p style="margin: 0 0 6px 0;">A KBEX não se responsabiliza por perdas ou danos resultantes de decisões tomadas com base nas informações aqui contidas. Rentabilidades passadas não garantem resultados futuros. Consulte sempre um consultor financeiro independente antes de tomar decisões de investimento.</p>
<p style="margin: 0; color: #D4AF37;">KBEX.io — Boutique Digital Assets Exchange</p>
</div>"""

    async def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        reply_to: Optional[str] = None,
        attachments: list = None,
    ) -> Dict[str, Any]:
        """
        Send a transactional email through Brevo.
        
        Args:
            to_email: Recipient email address
            to_name: Recipient display name
            subject: Email subject line
            html_content: HTML body content
            reply_to: Optional reply-to email address
            
        Returns:
            Dict with success status and message_id or error
        """
        if not self.api_key:
            logger.warning("BREVO_API_KEY not configured - email not sent")
            return {"success": False, "error": "Email service not configured", "simulated": True}
        
        headers = {
            "accept": "application/json",
            "api-key": self.api_key,
            "content-type": "application/json",
        }
        
        payload = {
            "sender": {
                "name": self.sender_name,
                "email": self.sender_email,
            },
            "to": [
                {
                    "email": to_email,
                    "name": to_name,
                }
            ],
            "subject": subject,
            "htmlContent": html_content + self.EMAIL_DISCLAIMER,
        }
        
        if reply_to:
            payload["replyTo"] = {"email": reply_to}
        
        if attachments:
            payload["attachment"] = attachments
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    BREVO_API_URL,
                    headers=headers,
                    json=payload,
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    logger.info(f"Email sent successfully to {to_email}: {data.get('messageId')}")
                    return {"success": True, "message_id": data.get("messageId")}
                else:
                    error_detail = response.text
                    logger.error(f"Failed to send email to {to_email}: {error_detail}")
                    return {"success": False, "error": error_detail}
                    
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_access_request_confirmation(
        self,
        to_email: str,
        to_name: str,
    ) -> Dict[str, Any]:
        """Send confirmation email when someone requests access via public form."""
        
        subject = "KBEX.io - Pedido de Acesso Recebido"
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #0a0a0a; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 40px; border: 1px solid #d4af3720;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 20px;">
                    <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 300;">KBEX.io</h1>
                    <p style="color: #a1a1aa; margin: 10px 0 0 0; font-size: 14px;">Premium Crypto Exchange</p>
                </div>
                
                <p style="color: #ffffff;">Caro(a) {to_name},</p>
                
                <p style="color: #d4d4d8;">Obrigado pelo seu interesse na KBEX.io. Recebemos o seu pedido de acesso à nossa plataforma exclusiva.</p>
                
                <div style="background-color: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #d4af37; margin: 0 0 15px 0; font-size: 16px;">O que acontece agora?</h3>
                    <ol style="color: #d4d4d8; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">A nossa equipa irá analisar o seu perfil</li>
                        <li style="margin-bottom: 8px;">Entraremos em contacto para conhecer as suas necessidades</li>
                        <li style="margin-bottom: 8px;">Após aprovação, receberá as credenciais de acesso</li>
                        <li style="margin-bottom: 8px;">Comece a operar com condições exclusivas</li>
                    </ol>
                </div>
                
                <p style="color: #d4d4d8;">O prazo habitual de resposta é de <strong style="color: #d4af37;">24 a 48 horas úteis</strong>.</p>
                
                <p style="color: #d4d4d8;">Se tiver alguma questão urgente, pode contactar-nos através de <a href="mailto:otc@kbex.io" style="color: #d4af37;">otc@kbex.io</a>.</p>
                
                <p style="color: #ffffff; margin-top: 30px;">Com os melhores cumprimentos,<br><span style="color: #d4af37;">Equipa KBEX.io</span></p>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a; color: #71717a; font-size: 12px;">
                    <p style="margin: 0;">Este email foi enviado para {to_email}</p>
                    <p style="margin: 5px 0;">KBEX.io - Premium Crypto Exchange</p>
                    <p style="margin: 5px 0;">Europa | Médio Oriente | Brasil</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, to_name, subject, html_content)

    async def send_onboarding_email(
        self,
        to_email: str,
        to_name: str,
        entity_name: str,
        registration_link: str,
    ) -> Dict[str, Any]:
        """Send onboarding email to new OTC lead to register on the platform."""
        
        subject = f"Bem-vindo à KBEX.io - Complete o seu Registo"
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #0a0a0a; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 40px; border: 1px solid #d4af3720;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 20px;">
                    <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 300;">KBEX.io</h1>
                    <p style="color: #a1a1aa; margin: 10px 0 0 0; font-size: 14px;">Premium Crypto Exchange</p>
                </div>
                
                <p style="color: #ffffff;">Caro(a) {to_name},</p>
                
                <p style="color: #d4d4d8;">Obrigado pelo seu interesse na KBEX.io. A nossa equipa de OTC analisou o seu perfil e estamos entusiasmados para iniciar a nossa parceria.</p>
                
                <p style="color: #d4d4d8;">Para dar continuidade ao processo de onboarding e começar a operar, por favor complete o seu registo na nossa plataforma:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{registration_link}" style="display: inline-block; padding: 15px 40px; background-color: #d4af37; color: #000000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Completar Registo</a>
                </div>
                
                <div style="background-color: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #d4af37; margin: 0 0 15px 0; font-size: 16px;">Próximos Passos:</h3>
                    <ol style="color: #d4d4d8; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Complete o registo na plataforma</li>
                        <li style="margin-bottom: 8px;">Realize a verificação de identidade (KYC)</li>
                        <li style="margin-bottom: 8px;">Aguarde a aprovação da nossa equipa</li>
                        <li style="margin-bottom: 8px;">Comece a operar com condições exclusivas</li>
                    </ol>
                </div>
                
                <p style="color: #d4d4d8;">Se tiver alguma dúvida, não hesite em contactar o seu gestor de conta ou responder a este email.</p>
                
                <p style="color: #ffffff; margin-top: 30px;">Com os melhores cumprimentos,<br><span style="color: #d4af37;">Equipa KBEX.io</span></p>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a; color: #71717a; font-size: 12px;">
                    <p style="margin: 0;">Este email foi enviado para {to_email}</p>
                    <p style="margin: 5px 0;">KBEX.io - Premium Crypto Exchange</p>
                    <p style="margin: 5px 0;">Europa | Médio Oriente | Brasil</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, to_name, subject, html_content)
    
    async def send_kyc_reminder_email(
        self,
        to_email: str,
        to_name: str,
        expired_documents: list,
    ) -> Dict[str, Any]:
        """Send KYC update reminder when documents are expired."""
        
        subject = "KBEX.io - Atualização de Documentos Necessária"
        
        docs_list = "".join([f"<li style='margin-bottom: 8px; color: #fbbf24;'>{doc}</li>" for doc in expired_documents])
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #0a0a0a; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 40px; border: 1px solid #d4af3720;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 20px;">
                    <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 300;">KBEX.io</h1>
                </div>
                
                <p style="color: #ffffff;">Caro(a) {to_name},</p>
                
                <p style="color: #d4d4d8;">Para continuarmos a processar as suas operações OTC, necessitamos que atualize os seguintes documentos:</p>
                
                <ul style="padding-left: 20px;">
                    {docs_list}
                </ul>
                
                <p style="color: #d4d4d8;">Por favor, aceda à sua área de cliente e submeta os documentos atualizados o mais brevemente possível.</p>
                
                <p style="color: #ffffff; margin-top: 30px;">Com os melhores cumprimentos,<br><span style="color: #d4af37;">Equipa KBEX.io</span></p>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(to_email, to_name, subject, html_content)

    # ==================== BREVO CRM CONTACTS ====================

    async def _brevo_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a request to the Brevo API (any endpoint)"""
        if not self.api_key:
            return {"success": False, "error": "BREVO_API_KEY not configured"}
        
        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "accept": "application/json"
        }
        url = f"{BREVO_BASE_URL}{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(method, url, headers=headers, **kwargs)
                if response.status_code in [200, 201, 204]:
                    return response.json() if response.content else {"success": True}
                else:
                    logger.error(f"Brevo API {method} {endpoint}: {response.status_code} - {response.text}")
                    return {"success": False, "error": response.text, "status_code": response.status_code}
        except Exception as e:
            logger.error(f"Brevo API error: {e}")
            return {"success": False, "error": str(e)}

    async def sync_contact_to_brevo(
        self,
        email: str,
        name: str,
        phone: Optional[str] = None,
        company: Optional[str] = None,
        source: Optional[str] = None,
        custom_attributes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create or update a contact in Brevo CRM"""
        attributes = {}
        if name:
            parts = name.split(" ", 1)
            attributes["FIRSTNAME"] = parts[0]
            if len(parts) > 1:
                attributes["LASTNAME"] = parts[1]
        if phone:
            attributes["SMS"] = phone
        if company:
            attributes["COMPANY"] = company
        if source:
            attributes["SOURCE"] = source
        if custom_attributes:
            for k, v in custom_attributes.items():
                attributes[k.upper()] = v

        payload = {
            "email": email,
            "attributes": attributes,
            "emailBlacklisted": False,
            "updateEnabled": True
        }

        result = await self._brevo_request("POST", "/contacts", json=payload)
        if result.get("id") or result.get("success"):
            logger.info(f"Synced contact to Brevo: {email}")
            return {"success": True, "brevo_id": result.get("id")}
        return result

    async def get_brevo_contact(self, email: str) -> Optional[Dict[str, Any]]:
        """Get contact info from Brevo"""
        result = await self._brevo_request("GET", f"/contacts/{email}")
        if "id" in result:
            return result
        return None

    async def setup_webhooks(self, webhook_url: str) -> Dict[str, Any]:
        """Setup Brevo webhooks for email event tracking"""
        events = ["delivered", "opened", "click", "hardBounce", "softBounce", "blocked", "unsubscribed"]
        
        payload = {
            "url": webhook_url,
            "events": events,
            "type": "transactional",
            "description": "KBEX email tracking webhook"
        }

        result = await self._brevo_request("POST", "/webhooks", json=payload)
        return result

    async def get_webhooks(self) -> List[Dict[str, Any]]:
        """List all configured webhooks"""
        result = await self._brevo_request("GET", "/webhooks")
        return result.get("webhooks", []) if isinstance(result, dict) else []


    async def send_team_member_welcome(
        self,
        to_email: str,
        to_name: str,
        internal_role: str,
        region: str,
        temp_password: str,
        frontend_url: str = "https://kbex.io",
    ) -> Dict[str, Any]:
        """Send welcome email to a new internal team member with role and region info."""

        role_labels = {
            "admin": "Administrador",
            "global_manager": "Gestor Global",
            "manager": "Gestor",
            "sales_manager": "Gestor de Vendas",
            "sales": "Vendas",
            "finance_general": "Finanças (Geral)",
            "finance_local": "Finanças (Local)",
            "finance": "Finanças",
            "support_manager": "Gestor de Suporte",
            "support_agent": "Agente de Suporte",
            "local_manager": "Gestor Local",
            "support": "Suporte",
        }

        region_labels = {
            "europe": "Europa",
            "mena": "Médio Oriente & Norte de África",
            "latam": "América Latina",
            "global": "Global",
        }

        role_display = role_labels.get(internal_role, internal_role)
        region_display = region_labels.get(region, region)

        subject = f"KBEX.io — Bem-vindo à Equipa | {role_display}"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="pt">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #0a0a0a; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 40px; border: 1px solid #d4af3720;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 20px;">
                    <h1 style="color: #D4AF37; font-size: 28px; margin: 0;">KBEX.io</h1>
                    <p style="color: #a1a1aa; font-size: 12px; margin: 5px 0 0;">Boutique Digital Assets Exchange</p>
                </div>

                <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 10px;">Bem-vindo à Equipa, {to_name}</h2>
                <p style="color: #a1a1aa; font-size: 14px;">A sua conta interna foi criada com sucesso na plataforma KBEX.</p>

                <div style="background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; color: #71717a; font-size: 13px; border-bottom: 1px solid #27272a;">Função</td>
                            <td style="padding: 10px 0; color: #D4AF37; font-weight: bold; font-size: 14px; text-align: right; border-bottom: 1px solid #27272a;">{role_display}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #71717a; font-size: 13px; border-bottom: 1px solid #27272a;">Região</td>
                            <td style="padding: 10px 0; color: #ffffff; font-weight: 500; font-size: 14px; text-align: right; border-bottom: 1px solid #27272a;">{region_display}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #71717a; font-size: 13px; border-bottom: 1px solid #27272a;">Email</td>
                            <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #27272a;">{to_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #71717a; font-size: 13px;">Password Temporária</td>
                            <td style="padding: 10px 0; color: #ef4444; font-family: monospace; font-size: 15px; text-align: right;">{temp_password}</td>
                        </tr>
                    </table>
                </div>

                <p style="color: #fbbf24; font-size: 12px; background: #78350f20; border: 1px solid #78350f40; border-radius: 6px; padding: 12px; margin: 20px 0;">
                    Por razões de segurança, altere a sua password no primeiro acesso.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/login" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #B8860B); color: #000; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 14px;">Aceder à Plataforma</a>
                </div>

                <p style="color: #71717a; font-size: 12px; text-align: center;">Se tiver dúvidas, contacte o administrador da plataforma.</p>
            </div>
        </body>
        </html>
        """

        return await self.send_email(to_email, to_name, subject, html_content)


# Global instance
email_service = BrevoEmailService()

"""
Brevo Email Service
Handles transactional email sending for OTC onboarding workflow
"""

import os
import logging
import httpx
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@kbex.io")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "KBEX.io")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoEmailService:
    """Email service using Brevo API for transactional emails."""
    
    def __init__(self):
        self.api_key = BREVO_API_KEY
        self.sender_email = BREVO_SENDER_EMAIL
        self.sender_name = BREVO_SENDER_NAME
    
    async def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        reply_to: Optional[str] = None,
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
            "htmlContent": html_content,
        }
        
        if reply_to:
            payload["replyTo"] = {"email": reply_to}
        
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


# Global instance
email_service = BrevoEmailService()

// Email template utilities for admin notifications

interface EmailTemplateProps {
  adminName: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  details?: any;
  timestamp: string;
}

export const getAdminActionEmailTemplate = ({
  adminName,
  actionType,
  entityType,
  entityId,
  details,
  timestamp,
}: EmailTemplateProps): string => {
  const actionColors: Record<string, string> = {
    create: '#10b981',
    update: '#3b82f6',
    delete: '#ef4444',
    view: '#8b5cf6',
    export: '#f59e0b',
  };

  const color = actionColors[actionType.toLowerCase()] || '#6b7280';
  const formattedDetails = details 
    ? `<div style="background: #f9fafb; border-left: 4px solid ${color}; padding: 12px; margin: 16px 0; border-radius: 4px;">
         <strong style="color: #374151; display: block; margin-bottom: 8px;">Details:</strong>
         <pre style="color: #6b7280; font-size: 13px; white-space: pre-wrap; word-break: break-word; margin: 0;">${JSON.stringify(details, null, 2)}</pre>
       </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Action Notification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      🔔 Admin Activity Alert
                    </h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                      Family Together Platform
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Action</strong>
                            <div style="margin-top: 4px;">
                              <span style="background-color: ${color}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                ${actionType}
                              </span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Entity Type</strong>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px; font-weight: 500;">
                              ${entityType}
                            </p>
                          </td>
                        </tr>
                        ${entityId ? `
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Entity ID</strong>
                            <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px; font-family: monospace;">
                              ${entityId}
                            </p>
                          </td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Performed By</strong>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px; font-weight: 500;">
                              ${adminName}
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;">
                            <strong style="color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Timestamp</strong>
                            <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                              ${new Date(timestamp).toLocaleString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                timeZoneName: 'short'
                              })}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    ${formattedDetails}
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin-top: 24px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px;">
                        <strong>⚠️ Security Notice:</strong> This action was performed by an administrator with elevated privileges. If you did not authorize this action, please contact your system administrator immediately.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                      This is an automated notification from the Family Together platform.<br/>
                      <span style="color: #9ca3af;">Please do not reply to this email.</span>
                    </p>
                    <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
                      © ${new Date().getFullYear()} Family Together. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const getWelcomeEmailTemplate = (userName: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Family Together</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <h1 style="margin: 0 0 16px 0; color: #1f2937; font-size: 28px;">
                      Welcome to Family Together! 🎉
                    </h1>
                    <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                      Hi ${userName},<br/><br/>
                      Your account has been successfully created. You're now part of the Family Together platform where families can manage their reunions, finances, and stay connected.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <div style="background-color: #f9fafb; border-radius: 6px; padding: 24px; text-align: center;">
                      <p style="margin: 0; color: #374151; font-size: 14px;">
                        Get started by exploring your dashboard and connecting with your family!
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} Family Together. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

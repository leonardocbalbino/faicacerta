/** Mensagens em português do Brasil. Chaves estáveis compartilhadas por API, app e painel. */
export const ptBR = {
  'errors.validation': 'Os dados enviados são inválidos.',
  'errors.unauthorized': 'Você precisa entrar na sua conta.',
  'errors.forbidden': 'Você não tem permissão para fazer isso.',
  'errors.notFound': 'Não encontramos o que você procurou.',
  'errors.conflict': 'Já existe um registro com esses dados.',
  'errors.tooManyRequests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  'errors.internal': 'Algo deu errado do nosso lado. Tente novamente em instantes.',

  'auth.invalidCredentials': 'E-mail ou senha incorretos.',
  'auth.emailInUse': 'Este e-mail já está cadastrado.',
  'auth.accountBlocked': 'Sua conta está bloqueada. Fale com o suporte.',
  'auth.invalidRefreshToken': 'Sua sessão expirou. Entre novamente.',
  'auth.refreshTokenReuse': 'Detectamos um uso suspeito da sua sessão. Entre novamente.',
  'auth.invalidSocialToken': 'Não foi possível confirmar seu login. Tente de novo.',
  'auth.socialEmailNotVerified': 'O e-mail dessa conta não está verificado no provedor.',
  'auth.socialNotConfigured': 'Este tipo de login ainda não está disponível.',
  'auth.invalidOrExpiredToken': 'O link é inválido ou expirou.',
  'auth.passwordResetSent':
    'Se o e-mail estiver cadastrado, enviamos as instruções para redefinir a senha.',

  'content.invalidTransition': 'Essa mudança de status não é permitida.',
  'content.mediaNotReady':
    'Há mídias ainda em processamento ou com erro. Aguarde ou troque antes de publicar.',
  'content.referenceNotFound': 'Um dos itens relacionados não existe ou foi removido.',
  'content.categoryNotEmpty': 'A categoria ainda tem subcategorias ou conteúdo.',
  'content.beltInUse': 'A faixa está em uso por usuários ou turmas e não pode ser removida.',
  'content.programInUse': 'O programa está em uso por usuários ou turmas e não pode ser removido.',
  'content.versionNotFound': 'Versão não encontrada.',
  'content.invalidReorder': 'A lista enviada não corresponde aos itens atuais.',
  'content.relatedSelf': 'Uma técnica não pode ser relacionada a ela mesma.',
  'content.categoryCycle':
    'Uma categoria não pode ficar dentro dela mesma ou de uma subcategoria sua.',

  'media.notFound': 'Mídia não encontrada.',
  'media.publicRequiresEditor': 'Só a equipe de conteúdo pode enviar mídia pública.',
  'media.notUploaded': 'O arquivo ainda não foi enviado.',
  'media.uploadMismatch': 'O arquivo enviado não confere com o que foi informado.',
  'media.invalidState': 'A mídia não está num estado que permita essa ação.',
  'media.inUse': 'A mídia está em uso e não pode ser removida.',
  'media.wrongType': 'O tipo da mídia não serve para este campo.',
  'media.mustBePublic': 'O conteúdo base só aceita mídia pública, enviada pelo CMS.',

  'billing.storeUnavailable':
    'Não foi possível confirmar a compra com a loja agora. Tente de novo.',
  'billing.storeNotConfigured': 'A confirmação de compras desta loja ainda não está configurada.',
  'billing.invalidPurchase': 'Não foi possível confirmar esta compra.',
  'billing.purchaseRevoked': 'Esta compra foi reembolsada ou cancelada pela loja.',
  'billing.purchasePending': 'A compra ainda está pendente na loja.',
  'billing.unknownProduct': 'Produto desconhecido.',
  'billing.purchaseOwnedByAnotherAccount':
    'Esta compra já está vinculada a outra conta do Faixa Certa.',
  'billing.alreadyOwned': 'Você já tem o Sem Anúncios.',
  'billing.salesDisabled': 'As vendas estão pausadas no momento.',
  'billing.planMissing': 'O plano não está configurado.',
  'billing.gatewayNotConfigured': 'O pagamento por Pix ainda não está disponível.',
  'billing.gatewayError': 'O serviço de pagamento não respondeu. Tente de novo em instantes.',
  'billing.apiKeyRequired': 'Informe a chave de API do Asaas.',

  'mail.verifyEmail.subject': 'Confirme seu e-mail no Faixa Certa',
  'mail.verifyEmail.body':
    'Olá, {name}!\n\nPara confirmar seu e-mail, acesse:\n{link}\n\nO link vale por 24 horas.',
  'mail.passwordReset.subject': 'Redefinição de senha do Faixa Certa',
  'mail.passwordReset.body':
    'Olá, {name}!\n\nPara criar uma nova senha, acesse:\n{link}\n\nO link vale por 1 hora. Se não foi você, ignore este e-mail.',
  'mail.guardianNotice.subject': 'Cadastro de {name} no Faixa Certa',
  'mail.guardianNotice.body':
    'Olá, {guardian}!\n\n{name} criou uma conta no Faixa Certa e informou você como responsável, com o seu consentimento.\n\nSe você não autorizou, responda este e-mail que a conta será excluída.',
} as const;

export type MessageKey = keyof typeof ptBR;

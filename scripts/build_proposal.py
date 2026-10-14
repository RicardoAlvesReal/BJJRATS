import base64

with open(r'c:\Users\ricar\Documents\dev-workspace\bjjrats\client\public\raos-logo.png', 'rb') as f:
    raos_b64 = base64.b64encode(f.read()).decode('utf-8')

with open(r'c:\Users\ricar\Documents\dev-workspace\bjjrats\client\public\favicon.png', 'rb') as f:
    bjj_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Comercial - RAOS Tecnologia | BJJRats</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');

    @page {{
      size: A4 portrait;
      margin: 8mm 13mm 8mm 13mm;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    html, body {{
      height: 100%;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e1b4b;
      background: #ffffff;
      line-height: 1.35;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    .container {{
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}

    /* HEADER */
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 2px solid #ede9fe;
      margin-bottom: 8px;
    }}

    .brand-group {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .raos-img {{
      height: 32px;
      width: auto;
      object-fit: contain;
    }}

    .divider-v {{
      width: 1px;
      height: 28px;
      background: #cbd5e1;
    }}

    .project-brand {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .bjj-img {{
      height: 34px;
      width: 34px;
      object-fit: contain;
      border-radius: 50%;
    }}

    .project-text {{
      display: flex;
      flex-direction: column;
    }}

    .project-title {{
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      line-height: 1;
    }}

    .project-sub {{
      font-size: 9.5px;
      color: #64748b;
      font-weight: 500;
    }}

    .doc-meta {{
      text-align: right;
    }}

    .badge {{
      display: inline-block;
      padding: 2px 8px;
      background: #f5f3ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }}

    .meta-text {{
      font-size: 9.5px;
      color: #64748b;
    }}

    /* INTRO */
    .intro-box {{
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 6px;
      padding: 7px 11px;
      margin-bottom: 8px;
      font-size: 10.5px;
      color: #4c1d95;
      line-height: 1.35;
    }}

    /* SECTION */
    .section-title {{
      font-size: 11.5px;
      font-weight: 700;
      color: #1e1b4b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      margin-top: 2px;
    }}

    .section-title::before {{
      content: '';
      width: 4px;
      height: 12px;
      background: #7c3aed;
      border-radius: 2px;
    }}

    /* CARDS */
    .scope-grid {{
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}

    .scope-card {{
      border: 1px solid #e2e8f0;
      border-left: 3px solid #7c3aed;
      border-radius: 6px;
      padding: 7px 11px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }}

    .card-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 3px;
    }}

    .card-number-title {{
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .card-number {{
      background: #7c3aed;
      color: #ffffff;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9.5px;
      font-weight: 700;
    }}

    .card-title {{
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
    }}

    .card-tag {{
      font-size: 9px;
      background: #f5f3ff;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
    }}

    .scope-list {{
      list-style: none;
      padding-left: 23px;
    }}

    .scope-list li {{
      position: relative;
      font-size: 10px;
      color: #334155;
      margin-bottom: 2px;
      line-height: 1.3;
    }}

    .scope-list li::before {{
      content: '✓';
      position: absolute;
      left: -14px;
      color: #7c3aed;
      font-weight: 800;
      font-size: 9.5px;
    }}

    /* INVESTMENT BOX */
    .invest-wrapper {{
      margin-top: 6px;
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 8px;
    }}

    .invest-box {{
      background: linear-gradient(135deg, #1e1b4b 0%, #2e1065 60%, #4c1d95 100%);
      color: #ffffff;
      border-radius: 6px;
      padding: 9px 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }}

    .invest-label {{
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #c4b5fd;
      font-weight: 600;
    }}

    .invest-amount {{
      font-size: 23px;
      font-weight: 800;
      color: #a78bfa;
      font-family: 'Barlow Condensed', sans-serif;
      letter-spacing: -0.5px;
      line-height: 1.1;
      margin: 1px 0;
    }}

    .invest-terms {{
      font-size: 10px;
      color: #e9d5ff;
    }}

    .invest-terms strong {{
      color: #ffffff;
    }}

    .deadline-box {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 7px 11px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
    }}

    .deadline-item {{
      font-size: 9.5px;
    }}

    .deadline-label {{
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5px;
      display: block;
    }}

    .deadline-val {{
      font-weight: 600;
      color: #1e1b4b;
      font-size: 9px;
      line-height: 1.25;
    }}

    /* NOTES */
    .notes-box {{
      margin-top: 6px;
      padding: 6px 9px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 5px;
      font-size: 9px;
      color: #92400e;
      line-height: 1.3;
    }}

    .notes-box strong {{
      color: #78350f;
    }}

    /* SIGNATURES */
    .signature-grid {{
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
      padding-top: 6px;
    }}

    .sign-block {{
      border-top: 1px solid #cbd5e1;
      text-align: center;
      padding-top: 4px;
    }}

    .sign-name {{
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
    }}

    .sign-company {{
      font-size: 9.5px;
      font-weight: 600;
      color: #7c3aed;
    }}

    .sign-role {{
      font-size: 9px;
      color: #64748b;
    }}

    .footer {{
      margin-top: 6px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 3px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div>
      <!-- HEADER -->
      <header class="header">
        <div class="brand-group">
          <img src="data:image/png;base64,{raos_b64}" alt="RAOS Tecnologia" class="raos-img" />
          <div class="divider-v"></div>
          <div class="project-brand">
            <img src="data:image/png;base64,{bjj_b64}" alt="BJJRats" class="bjj-img" />
            <div class="project-text">
              <h1 class="project-title">BJJRats</h1>
              <p class="project-sub">Gestão & Treino de Jiu-Jitsu</p>
            </div>
          </div>
        </div>
        <div class="doc-meta">
          <span class="badge">Proposta de Atualização</span>
          <p class="meta-text"><strong>RAOS Tecnologia</strong></p>
          <p class="meta-text"><strong>Data:</strong> Outubro de 2026</p>
        </div>
      </header>

      <!-- INTRO -->
      <div class="intro-box">
        A <strong>RAOS Tecnologia</strong> apresenta a proposta técnica e de valores para implementação do pacote de atualizações e novas funcionalidades na plataforma <strong>BJJRats</strong>, que já se encontra em operação, expandindo a capacidade de pagamentos integrados às lojas mobile, controle de inadimplência e disponibilização de acervo de vídeos instrucionais.
      </div>

      <!-- ESCOPO -->
      <h2 class="section-title">Escopo dos Serviços de Atualização</h2>
      <div class="scope-grid">
        <!-- ITEM 1 -->
        <div class="scope-card">
          <div class="card-header">
            <div class="card-number-title">
              <span class="card-number">1</span>
              <span class="card-title">Pagamento Nativo Apple App Store & Google Play Store</span>
            </div>
            <span class="card-tag">Monetização Mobile</span>
          </div>
          <ul class="scope-list">
            <li>Implementação e integração do fluxo de compras e assinaturas in-app (IAP) para iOS e Android;</li>
            <li>Configuração de produtos digitais nas contas das lojas e sincronização via webhooks no backend;</li>
            <li>Rotinas de liberação automática de acesso, tratamento de renovações e revogações de assinatura;</li>
            <li>Telas em conformidade com as diretrizes das lojas (Restaurar Compras e Termos de Uso).</li>
          </ul>
        </div>

        <!-- ITEM 2 -->
        <div class="scope-card">
          <div class="card-header">
            <div class="card-number-title">
              <span class="card-number">2</span>
              <span class="card-title">Extrato de Mensalidades do Aluno & Sistema de Bloqueio por Atraso</span>
            </div>
            <span class="card-tag">Gestão Financeira</span>
          </div>
          <ul class="scope-list">
            <li>Painel completo para o aluno acompanhar cobranças: mensalidades Pagas, Pendentes e Vencidas;</li>
            <li>Alertas visuais de vencimento com status claros e orientações diretas para regularização;</li>
            <li>Régua de carência/tolerância com mecanismo de bloqueio preventivo de acessos em caso de inadimplência;</li>
            <li>Desbloqueio automatizado das permissões do aplicativo após identificação de quitação.</li>
          </ul>
        </div>

        <!-- ITEM 3 -->
        <div class="scope-card">
          <div class="card-header">
            <div class="card-number-title">
              <span class="card-number">3</span>
              <span class="card-title">Aba de Vídeos Instrucionais (Posições & Finalizações)</span>
            </div>
            <span class="card-tag">Conteúdo & Treino</span>
          </div>
          <ul class="scope-list">
            <li>Desenvolvimento de nova aba exclusiva para catálogo e consumo de vídeos instrucionais;</li>
            <li>Módulo para professores e instrutores realizarem upload de vídeos com duração de até 2 minutos (120s);</li>
            <li>Validação automática de tempo no envio e player otimizado para dispositivos móveis;</li>
            <li>Categorização e filtros por técnicas (Passagens de Guarda, Raspagens, Finalizações, Defesas e Faixas).</li>
          </ul>
        </div>
      </div>

      <!-- INVESTIMENTO E PRAZOS -->
      <h2 class="section-title">Investimento & Prazos de Execução</h2>
      <div class="invest-wrapper">
        <div class="invest-box">
          <span class="invest-label">Investimento Total das Atualizações</span>
          <span class="invest-amount">R$ 1.000,00</span>
          <p class="invest-terms"><strong>Condições de Pagamento:</strong> A combinar entre as partes.</p>
        </div>

        <div class="deadline-box">
          <div class="deadline-item">
            <span class="deadline-label">Previsão de Execução</span>
            <p class="deadline-val">Prazo estimado flexível, a ser conduzido de acordo com as etapas de desenvolvimento técnico e os ciclos de validação.</p>
          </div>
          <div class="deadline-item">
            <span class="deadline-label">Condicionantes de Prazo</span>
            <p class="deadline-val">O cronograma poderá ser estendido ou adaptado em razão de aprovações externas (análise das lojas Apple/Google), revisões de diretrizes ou dependências técnicas inerentes ao processo.</p>
          </div>
        </div>
      </div>

      <!-- OBSERVAÇÕES -->
      <div class="notes-box">
        <strong>Premissas Gerais:</strong> As contas de desenvolvedor na Apple Developer ($99/ano) e Google Play Console ($25) devem estar ativas sob responsabilidade do contratante para vinculação dos pagamentos. Taxas de intermediação das lojas e eventuais custos de infraestrutura em nuvem de mídia são de responsabilidade do contratante.
      </div>
    </div>

    <div>
      <!-- ASSINATURAS -->
      <div class="signature-grid">
        <div class="sign-block">
          <p class="sign-name">RAOS Tecnologia</p>
          <p class="sign-company">Desenvolvimento & Soluções em Software</p>
          <p class="sign-role">Responsável Técnico</p>
        </div>
        <div class="sign-block">
          <p class="sign-name">De Acordo / Aceite do Contratante</p>
          <p class="sign-company">BJJRats</p>
          <p class="sign-role">Data: ____ / ____ / ________</p>
        </div>
      </div>

      <!-- FOOTER -->
      <footer class="footer">
        RAOS Tecnologia • Desenvolvimento de Software • Proposta Comercial para BJJRats • Documento Confidencial
      </footer>
    </div>
  </div>
</body>
</html>
"""

with open(r'c:\Users\ricar\Documents\dev-workspace\bjjrats\docs\proposta-atualizacoes-bjjrats.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('HTML built successfully!')

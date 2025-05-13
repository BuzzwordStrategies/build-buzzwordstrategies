const docusign = require('docusign-esign');

exports.handler = async (event) => {
  try {
    console.log('DocuSign function called');
    
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const data = JSON.parse(event.body);
    const { bundleID, bundleName, subLength, finalMonthly, selectedServices } = data;

    // DocuSign configuration
    const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
    const USER_ID = process.env.DOCUSIGN_USER_ID || '31781807-3baa-4ccf-b93d-fad33296057b';
    const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
    const TEMPLATE_ID = process.env.DOCUSIGN_TEMPLATE_ID;
    const SECRET_KEY = process.env.DOCUSIGN_SECRET_KEY;
    const BASE_URL = 'https://demo.docusign.net/restapi';

    // Create DocuSign API client
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(BASE_URL);
    
    // Configure OAuth basePath
    dsApiClient.setOAuthBasePath('account-d.docusign.com');
    
    try {
      // Get JWT access token
      const jwtToken = await dsApiClient.requestJWTUserToken(
        INTEGRATION_KEY,
        USER_ID,
        'signature',
        SECRET_KEY,
        3600
      );
      
      const accessToken = jwtToken.body.access_token;
      dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
      
    } catch (authError) {
      console.error('JWT Auth Error:', authError);
      // Fallback to simpler token approach
      dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + SECRET_KEY);
    }
    
    // Create envelope definition
    const envelopeDefinition = new docusign.EnvelopeDefinition();
    envelopeDefinition.templateId = TEMPLATE_ID;
    envelopeDefinition.status = 'sent';
    
    // Create tabs for the template
    const textTabs = [
      { tabLabel: 'bundleID', value: bundleID || '' },
      { tabLabel: 'bundleName', value: bundleName || '' },
      { tabLabel: 'subLength', value: subLength || '' },
      { tabLabel: 'finalMonthly', value: finalMonthly || '' },
      { tabLabel: 'selectedServices', value: selectedServices || '' }
    ];
    
    // Create template role
    const signer = new docusign.TemplateRole();
    signer.roleName = 'Client';
    signer.tabs = { textTabs: textTabs };
    
    // Add the signer to the envelope
    envelopeDefinition.templateRoles = [signer];
    
    // Create the Envelopes API instance
    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    
    // Create the envelope
    const envelopeResult = await envelopesApi.createEnvelope(ACCOUNT_ID, { envelopeDefinition });
    
    // Create a recipient view for immediate signing
    const viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = `https://www.buzzwordstrategies.com/.netlify/functions/docusign-success?bundleID=${bundleID}&bundleName=${encodeURIComponent(bundleName)}&finalMonthly=${finalMonthly}&subLength=${subLength}`;
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = 'customer@example.com';  // Placeholder email
    viewRequest.userName = 'Customer';  // Placeholder name
    viewRequest.recipientId = '1';
    viewRequest.clientUserId = '1001';
    
    // Get the recipient view
    const recipientViewResult = await envelopesApi.createRecipientView(
      ACCOUNT_ID, 
      envelopeResult.envelopeId, 
      { recipientViewRequest: viewRequest }
    );

    // Return the URL
    return {
      statusCode: 200,
      body: JSON.stringify({ url: recipientViewResult.url })
    };
    
  } catch (error) {
    console.error('DocuSign Error:', error);
    console.error('Error details:', error.response ? error.response.body : 'No response body');
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to create envelope',
        details: error.response ? error.response.body : null
      })
    };
  }
};

const docusign = require('docusign-esign');

exports.handler = async (event) => {
  try {
    console.log('DocuSign function called');
    
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const data = JSON.parse(event.body);
    const { bundleID, bundleName, subLength, finalMonthly, selectedServices, customerEmail, customerName } = data;

    // Validate customer email and name
    if (!customerEmail || !customerName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Customer email and name are required' }) };
    }

    // DocuSign configuration
    const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
    const USER_ID = process.env.DOCUSIGN_USER_ID || '31781807-3baa-4ccf-b93d-fad33296057b';
    const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
    const TEMPLATE_ID = process.env.DOCUSIGN_TEMPLATE_ID;
    const SECRET_KEY = process.env.DOCUSIGN_SECRET_KEY.replace(/\\n/g, '\n'); // Handle newlines in key
    const BASE_URL = 'https://demo.docusign.net/restapi';

    // Create DocuSign API client
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(BASE_URL);
    
    // Configure OAuth basePath
    dsApiClient.setOAuthBasePath('account-d.docusign.com');
    
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
      { tabLabel: 'selectedServices', value: Array.isArray(selectedServices) ? selectedServices.join(', ') : selectedServices || '' }
    ];
    
    // Create template role with customer details
    const signer = new docusign.TemplateRole();
    signer.roleName = 'Client'; // Must match the role in your DocuSign template
    signer.email = customerEmail;
    signer.name = customerName;
    signer.clientUserId = '1001'; // Required for embedded signing
    signer.tabs = { textTabs: textTabs };
    
    // Add the signer to the envelope
    envelopeDefinition.templateRoles = [signer];
    
    // Create the Envelopes API instance
    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    
    // Create the envelope
    const envelopeResult = await envelopesApi.createEnvelope(ACCOUNT_ID, { envelopeDefinition });
    
    // Create a recipient view for embedded signing
    const viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = `https://www.buzzwordstrategies.com/.netlify/functions/docusign-success?bundleID=${bundleID}&bundleName=${encodeURIComponent(bundleName)}&finalMonthly=${finalMonthly}&subLength=${subLength}`;
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = customerEmail;
    viewRequest.userName = customerName;
    viewRequest.recipientId = '1';
    viewRequest.clientUserId = '1001'; // Must match signer's clientUserId
    
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

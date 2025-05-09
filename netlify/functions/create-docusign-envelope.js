const docusign = require('docusign-esign');

// DocuSign configuration from environment variables
const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY || '14b7cc3d-5c81-42e6-b6d1-db387d7f5b1e';
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID || '44cc2891-7fdd-4349-90ae-3052baabbd2';
const TEMPLATE_ID = process.env.DOCUSIGN_TEMPLATE_ID || 'ca675320-b73c-4d59-9b15-b7c071ffd196';

// For development, we'll use a simplified auth approach
// In production, use proper secure authentication via environment variables
const SECRET_KEY = process.env.DOCUSIGN_SECRET_KEY;
const BASE_URL = 'https://demo.docusign.net/restapi';

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const data = JSON.parse(event.body);
    const { bundleID, bundleName, subLength, finalMonthly, selectedServices } = data;

    // Create DocuSign API client
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(BASE_URL);
    
    // In a real implementation, we would properly authenticate
    // For now, we'll use a simpler approach for development
    dsApiClient.addDefaultHeader('Authorization', `Bearer ${SECRET_KEY}`);
    
    // Create envelope definition
    const envelopeDefinition = new docusign.EnvelopeDefinition();
    envelopeDefinition.templateId = TEMPLATE_ID;
    envelopeDefinition.status = 'sent';
    
    // Create tabs for the template
    const textTabs = [
      { tabLabel: 'bundleID', value: bundleID },
      { tabLabel: 'bundleName', value: bundleName },
      { tabLabel: 'subLength', value: subLength },
      { tabLabel: 'finalMonthly', value: finalMonthly },
      { tabLabel: 'selectedServices', value: selectedServices }
    ];
    
    // Create a template role for the signer
    const signer = new docusign.TemplateRole();
    signer.roleName = 'Client'; // This must match the role name in your template
    signer.email = '';  // Will be filled by the recipient
    signer.name = '';   // Will be filled by the recipient
    signer.tabs = { textTabs: textTabs };
    
    // Add the signer to the envelope
    envelopeDefinition.templateRoles = [signer];
    
    // Create the Envelopes API instance
    const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    
    // Create the envelope
    const envelopeResponse = await envelopesApi.createEnvelope(ACCOUNT_ID, { envelopeDefinition });
    
    // Create the URL where the signer will go to fill out the envelope
    const viewRequest = new docusign.RecipientViewRequest();
    viewRequest.returnUrl = `https://www.buzzwordstrategies.com/.netlify/functions/docusign-success?bundleID=${bundleID}&bundleName=${encodeURIComponent(bundleName)}&finalMonthly=${finalMonthly}&subLength=${subLength}`;
    viewRequest.authenticationMethod = 'none';
    viewRequest.email = '';  // Will be filled by recipient
    viewRequest.userName = '';  // Will be filled by recipient
    
    // Get the recipient view URL
    const recipientView = await envelopesApi.createRecipientView(
      ACCOUNT_ID, 
      envelopeResponse.envelopeId, 
      { recipientViewRequest: viewRequest }
    );

    // Return the URL to redirect to
    return {
      statusCode: 200,
      body: JSON.stringify({ url: recipientView.url })
    };
  } catch (error) {
    console.error('DocuSign Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to create envelope' })
    };
  }
};

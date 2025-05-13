const docusign = require('docusign-esign');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  const { bundleID, bundleName, subLength, finalMonthly, selectedServices } = JSON.parse(event.body);
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath('https://demo.docusign.net/restapi'); // Demo environment

  const privateKey = process.env.DOCUSIGN_SECRET_KEY.replace(/\\n/g, '\n'); // Handle newline in env
  const assertion = jwt.sign(
    { sub: process.env.DOCUSIGN_USER_ID, scope: 'signature' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '1h', issuer: process.env.DOCUSIGN_INTEGRATION_KEY }
  );

  try {
    const results = await dsApiClient.requestJWTUserToken(process.env.DOCUSIGN_INTEGRATION_KEY, process.env.DOCUSIGN_USER_ID, ['signature'], assertion);
    dsApiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);

    const envelope = {
      emailSubject: `Sign Contract for ${bundleName}`,
      templateId: process.env.DOCUSIGN_TEMPLATE_ID,
      templateRoles: [{
        email: 'customer@example.com', // Replace with dynamic email
        name: 'Customer Name', // Replace with dynamic name
        roleName: 'Signer1',
        tabs: {
          textTabs: [
            { tabLabel: 'bundleID', value: bundleID },
            { tabLabel: 'bundleName', value: bundleName },
            { tabLabel: 'subLength', value: subLength },
            { tabLabel: 'finalMonthly', value: finalMonthly },
            { tabLabel: 'selectedServices', value: selectedServices.join(', ') },
          ],
        },
      }],
      status: 'sent',
    };

    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    const results = await dsApiClient.envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope });
    const viewRequest = { returnUrl: `${process.env.URL}/.netlify/functions/docusign-success?bundleID=${bundleID}` };
    const view = await dsApiClient.envelopesApi.createRecipientView(accountId, results.envelopeId, viewRequest);

    return { statusCode: 200, body: JSON.stringify({ redirectUrl: view.url }) };
  } catch (error) {
    console.error('DocuSign Error:', error.response ? error.response.body : error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

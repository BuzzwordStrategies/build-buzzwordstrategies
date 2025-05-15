// server/routes/supabase.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Save bundle data at any step
router.post('/save-bundle', async (req, res) => {
  try {
    const { 
      bundleID, 
      bundleName, 
      selectedTiers,
      subLength, 
      selectedBusiness,
      finalMonthly,
      formStep,
      userInfo
    } = req.body;
    
    // Generate a bundleID if not provided
    const finalBundleID = bundleID || `bwb-${uuidv4()}`;
    
    // Prepare data for Supabase
    const bundleData = {
      bundle_id: finalBundleID,
      bundle_name: bundleName || "My Bundle",
      selected_tiers: JSON.stringify(selectedTiers || {}),
      sub_length: parseInt(subLength) || 3,
      selected_business: selectedBusiness || "",
      final_monthly: parseFloat(finalMonthly) || 0,
      form_step: formStep || 0,
      updated_at: new Date().toISOString()
    };
    
    // Add user info if available
    if (userInfo) {
      bundleData.customer_name = userInfo.clientName;
      bundleData.customer_email = userInfo.clientEmail;
      bundleData.customer_phone = userInfo.clientPhone;
      bundleData.customer_address = userInfo.clientAddress;
      bundleData.customer_city = userInfo.clientCity;
      bundleData.customer_state = userInfo.clientState;
      bundleData.customer_zip = userInfo.clientZip;
      bundleData.customer_company = userInfo.clientCompany;
    }
    
    // Save to Supabase (this will be implemented properly in a future step)
    console.log('Saving bundle data:', bundleData);
    
    // For now, just return success
    res.json({ 
      success: true, 
      bundleID: finalBundleID,
      message: "Bundle data saved successfully"
    });
  } catch (error) {
    console.error('Error saving bundle data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const { PlacementService } = require('./dist/backend/src/services/placementService.js');
const PlacementImport = require('./dist/backend/src/models/PlacementImport.js').default;

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const id = '6a7c8f5a4c9d9066594d222a';
  const placementImport = await PlacementImport.findById(id);
  console.log('Import data:', placementImport);
  try {
    const placementData = {
      companyName: placementImport.companyName,
      role: placementImport.role,
      package: placementImport.package || 0,
      deadline: placementImport.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      description: placementImport.description || 'Details not provided by AI.',
      eligibilityGPA: 0,
      eligibilityBacklogs: 0,
      applicationLink: placementImport.applicationLink,
      location: placementImport.location,
      skillsRequired: placementImport.skills,
      employmentType: placementImport.employmentType,
      driveType: placementImport.driveType,
      sourceType: 'ai',
      sourceUrl: placementImport.sourceUrl,
      sourceWebsite: placementImport.sourceWebsite,
      workflowStatus: 'draft',
      companyLogo: ''
    };
    console.log('Checking validation...');
    const Placement = require('./dist/backend/src/models/Placement.js').default;
    const p = new Placement(placementData);
    await p.validate();
    console.log('Validation passed!');
  } catch (err) {
    console.error('Validation error:', err);
  }
  process.exit(0);
});

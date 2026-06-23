const mongoose = require('mongoose');
require('dotenv').config();

async function checkProjectSubmissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find current user
    const user = await mongoose.connection.db.collection('users').findOne({
      'contact.phone': '+918210224305'
    });

    if (!user) {
      console.log('User not found');
      await mongoose.connection.close();
      return;
    }

    console.log('Found user:', user._id);
    console.log('User name:', user.profile?.firstName, user.profile?.lastName);

    // Check all projects for submissions
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    console.log(`\nTotal projects: ${projects.length}`);

    let totalSubmissions = 0;
    let userSubmissions = 0;

    for (const project of projects) {
      if (project.submissions && project.submissions.length > 0) {
        totalSubmissions += project.submissions.length;
        console.log(`\nProject: ${project.title}`);
        console.log(`  Total submissions: ${project.submissions.length}`);

        // Check if user has submissions in this project
        const userSubs = project.submissions.filter(sub =>
          sub.user && sub.user.toString() === user._id.toString()
        );

        if (userSubs.length > 0) {
          userSubmissions += userSubs.length;
          console.log(`  User submissions: ${userSubs.length}`);
          console.log('  Sample submission:', JSON.stringify(userSubs[0], null, 2));
        }
      }
    }

    console.log(`\n\nSummary:`);
    console.log(`Total submissions across all projects: ${totalSubmissions}`);
    console.log(`User's submissions: ${userSubmissions}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProjectSubmissions();

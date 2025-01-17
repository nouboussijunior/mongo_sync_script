import { watchChanges } from './changeHandler.js';
// import { initCronTasks, startPushChanges } from './pushChanges.js';
import { initCronTasks, pushChanges } from './pushChanges.js';
import { startPullChanges } from './pullChanges.js';
import dotenv from 'dotenv';
import './cleanOldChanges.js'; // Import the scheduled task to clean old changes
import { startServer } from './onlineServerHandler.js'; // Import the server handler
import { createIndexes } from './db.js';

dotenv.config();

// Environment variables
const pushInterval = parseInt(process.env.PUSH_INTERVAL, 10) || 600000; // 10 minutes
const pullInterval = parseInt(process.env.PULL_INTERVAL, 10) || 600000; // 10 minutes

const main = async () => {
  try {
    // Start the online server
    await startServer();

    await createIndexes();
    
    //Start Push Cron tasks
    initCronTasks();
    
    // Start watching changes in the local MongoDB collections
    // watchChanges();
    setInterval(() => watchChanges(), pushInterval); // 10 minutes
    console.log('Started watching changes');

    // Periodically push changes to the online server
    setInterval(() => pushChanges(), pushInterval); // 3 minutes
    console.log('Scheduled periodic push of changes');

    // Periodically pull changes from the online server
    setInterval(() => startPullChanges(), pullInterval);
    console.log('Scheduled periodic pull of changes');
    // setInterval(() => startPullChanges(), 4000);
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

main();


// import { watchChanges } from './changeHandler.js';
// import { startPushChanges  } from './pushChanges.js';
// // import { pullChanges } from './pullChanges.js';
// import './pullChanges.js';
// import dotenv from 'dotenv';
// import './cleanOldChanges.js'; // Import the scheduled task to clean old changes

// dotenv.config();

// // Environment variables
// const pushInterval = parseInt(process.env.PUSH_INTERVAL, 10) || 180000; // 3 minutes
// // const pullInterval = parseInt(process.env.PULL_INTERVAL, 10) || 240000; // 4 minutes
// const pullInterval = parseInt(process.env.PULL_INTERVAL, 10) || 1000; // 4 minutes

// const main = async () => {
//   try {
//     // Start watching changes in the local MongoDB collections
//     watchChanges();
//     console.log('Started watching changes');

//     // Periodically push changes to the online server
//     setInterval(() => startPushChanges(), pushInterval); // 3 minutes
//     console.log('Scheduled periodic push of changes');

//     // Periodically pull changes from the online server
//     // setInterval(pullChanges(), pullInterval);
//     console.log('Scheduled periodic pull of changes');
//   } catch (error) {
//     console.error('Error in main function:', error);
//   }
// };

// main();


// // // // // src/app.js

// // // // import { connectToDatabase, watchChanges } from './db.js';
// // // // import { syncChange } from './syncService.js';
// // // // import './receiver.js'; // Import the receiver server to start it

// // // // const main = async () => {
// // // //   try {
// // // //     await connectToDatabase();
// // // //     await watchChanges(syncChange);
// // // //   } catch (err) {
// // // //     console.error('Error:', err);
// // // //   }
// // // // };

// // // // main();


// // // // src/main.js (for both Server A and B)

// // // import { watchChanges } from './changeHandler';
// // // import { pushChanges } from './pushChanges';
// // // import { fetchChanges } from './pullChanges';

// // // // Environment variables
// // // const pushInterval = 180000; // 3 minutes
// // // const pullInterval = 240000; // 4 minutes

// // // const main = async () => {
// // //   try {
// // //     // Start watching changes in the local MongoDB collections
// // //     watchChanges();
// // //     console.log('Started watching changes');

// // //     // Periodically push changes to the online server
// // //     setInterval(pushChanges, pushInterval);
// // //     console.log('Scheduled periodic push of changes');

// // //     // Periodically pull changes from the online server
// // //     setInterval(fetchChanges, pullInterval);
// // //     console.log('Scheduled periodic pull of changes');
// // //   } catch (error) {
// // //     console.error('Error in main function:', error);
// // //   }
// // // };

// // // main();

// // // import watchChanges  from './changeHandler';
// // // import { pushChanges } from './pushChanges';
// // // import { fetchChanges } from './pullChanges';
// // import dotenv from 'dotenv';
// // import { watchChanges } from './changeHandler';

// // dotenv.config();

// // // Environment variables
// // const pushInterval = parseInt(process.env.PUSH_INTERVAL, 10) || 180000; // 3 minutes
// // const pullInterval = parseInt(process.env.PULL_INTERVAL, 10) || 240000; // 4 minutes

// // const main = async () => {
// //   try {
// //     // Start watching changes in the local MongoDB collections
// //     watchChanges();
// //     console.log('Started watching changes');

// //     // Periodically push changes to the online server
// //     setInterval(pushChanges, pushInterval);
// //     console.log('Scheduled periodic push of changes');

// //     // Periodically pull changes from the online server
// //     setInterval(fetchChanges, pullInterval);
// //     console.log('Scheduled periodic pull of changes');
// //   } catch (error) {
// //     console.error('Error in main function:', error);
// //   }
// // };

// // main();

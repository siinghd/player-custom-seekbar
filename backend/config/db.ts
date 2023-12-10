import mongoose from 'mongoose';

const connectWithDb = (callback: any) => {
  mongoose
    .connect(process.env.MONGO_URI as string)
    .then(() => {
      console.log('DB GOT CONNECTED');
      callback();
    })
    .catch((error: Error) => {
      console.log('DB CONNECTION ISSUES');
      console.log(error);
      process.exit(1);
    });
};

export default connectWithDb;

# Quantitative Financial Analysis Application

This is the React frontend that consumes a django API

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

## Make sure that the Django dataFlow repo has been cloned and the deploy.sh sctipt has been run locally to update the latest financial data, create a .env file a newly generated secret key and run the local development server

# NOTES: update frequency of daily data is done with data date measured against todays date, but fedbalance and others can be given specific delta from timestamp of last update. this can lead to late updates if a timestamp is close to the scheduled update, as it wont update until the delta expires

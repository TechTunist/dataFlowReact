// function CryptoFearAndGreedIndex({ isDashboard }) {
//     // Define styles for when the component is on the dashboard
//     const dashboardStyle = {
//         width: '50%', 
//         height: '50%', 
//         maxWidth: '50%',
//         minWidth: '300px' // Ensure the image does not exceed its container
//     };

//     // Define alternative styles for non-dashboard view or leave as undefined for default behavior
//     const defaultStyle = {
//         width: '90%', // Allow the image to fill 90% of its parent container
//         height: 'auto', // Maintain aspect ratio
//         maxWidth: '800px', // Limit maximum width to prevent the image from being too large
//         margin: 'auto', // Center the image within its parent container
//     };

//     return (
//         <div style={{ border: '2px solid #a9a9a9', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//             <img 
//                 src="https://alternative.me/crypto/fear-and-greed-index.png" 
//                 alt="Latest Crypto Fear & Greed Index"
//                 style={isDashboard ? dashboardStyle : defaultStyle}
//             />
//             {
//                 !isDashboard && (
//                     <p className='chart-info' style={{ marginTop: '20px', textAlign: 'center', width: '90%' }}> {/* Adjust width as necessary */}
//                         The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data, including surveys, social media, volatility, market momentum, and volume among others.
//                         <br/> The information has been provided here: <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
//                     </p>
//                 )   
//             }
//         </div>
//     );
// }

// export default CryptoFearAndGreedIndex;


import React, { useEffect, useState } from 'react';
import GaugeChart from 'react-gauge-chart'
import { tokens } from "../theme";
import { useTheme } from "@mui/material";


function CryptoFearAndGreedIndex({ isDashboard }) {
  // Assuming `fearAndGreedValue` is a value between 0 and 1, where 0 represents "Extreme Fear" and 1 represents "Extreme Greed"
  // You might need to normalize your actual Fear and Greed index value to this range.
  const [fearAndGreedValue, setFearAndGreedValue] = useState([]);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);


    // Fetch and process data
    useEffect(() => {
        const cacheKey = 'fearAndGreedData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();

        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);

            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                setFearAndGreedValue(parsedData);
            } else {
                fetchData();
            }
            
        } else {
            fetchData();
        }

        function fetchData() {
            fetch('https://tunist.pythonanywhere.com/api/fear-and-greed/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    value: parseInt(item.value),
                    value_classification: item.value_classification,
                }));             
                // save the data to local storage
                localStorage.setItem(cacheKey, JSON.stringify(formattedData));
                setFearAndGreedValue(formattedData);

            })
            .catch(error => console.error('Error fetching data: ', error));
        }
        
    }, []);

  const chartStyle = {
    width: isDashboard ? '50%' : '90%', // Adjust based on your styling needs
  };

  let value = fearAndGreedValue.length ? fearAndGreedValue[fearAndGreedValue.length - 1].value / 100 : 0;
  const value_classification = fearAndGreedValue.length ? fearAndGreedValue[fearAndGreedValue.length - 1].value_classification : '';

  const gaugeColors = ["#4BC0C8", "#33D1FF", "#66A3FF", "#9996FF", "#CC89FF", "#FF7DFF", "#FF61C3", "#FF4590", "#FF295D", "#FF0033", "#FF0033"];

  const getColorByPercent = (percent) => {
    const index = Math.min(Math.floor(percent * gaugeColors.length), gaugeColors.length - 1);
    return gaugeColors[index];
  };

  const textColor = getColorByPercent(value);

return (
    <div style={{ height: '100%' }}>
        <div style={{ 
            display: 'flex', // Use flex display for the container
            justifyContent: 'space-between', // This spreads out the child elements
            alignItems: 'center', // This vertically centers the children
            marginBottom: '0px', 
            height: '30px'
        }}>
            <div>
                
            </div>
           
        </div>
        
        <div className="chart-container" style={{ 
            position: 'relative',
            height: 'calc(100% - 40px)', 
            width: '100%', 
            border: '2px solid #a9a9a9', // Adds dark border with your specified color
            display: 'flex', 
            flexDirection: 'column', // Stack children vertically
            justifyContent: 'center', // Centers vertically
            alignItems: 'center', // Centers horizontally
        }}> 
            <div style={{
                width: '100%', // Takes the full width of the container
                maxWidth: isDashboard ? '500px' : '1000px', // Maximum width the gauge can grow to only if isDashboard is true
                display: 'flex',
                justifyContent: 'center',
            }}>
                <GaugeChart id="gauge-chart3"
                    nrOfLevels={10}
                    colors={["#4BC0C8",  "#FF0033"]}
                    arcWidth={0.3}
                    percent={value}
                    needleColor="#4BC0C8"
                    needleBaseColor="#4BC0C8"
                    // textColor={colors.greenAccent[500]}
                    textColor={textColor}
                />
            </div>
            <h1 style={{ marginTop: '5px', color: textColor }}>{value_classification}</h1>
        </div>
        {
            !isDashboard && (
                <p className='chart-info' style={{ marginTop: '20px', textAlign: 'center', width: '100%' }}> {/* Adjust width as necessary */}
                    The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data, including surveys, social media, volatility, market momentum, and volume among others.
                    <br/> The information has been provided here: <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
                </p>
            )   
        }
    </div>
);
}

export default CryptoFearAndGreedIndex;

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


import React, { useRef, useEffect, useState } from 'react';
import GaugeChart from 'react-gauge-chart'

function CryptoFearAndGreedIndex({ isDashboard }) {
  // Assuming `fearAndGreedValue` is a value between 0 and 1, where 0 represents "Extreme Fear" and 1 represents "Extreme Greed"
  // You might need to normalize your actual Fear and Greed index value to this range.
  const fearAndGreedValueExample = 0.75; // Example value
  const [fearAndGreedValue, setFearAndGreedValue] = useState([]);


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
                    time: item.date,
                    value: parseFloat(item.close)
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

  return (
    <div style={{ border: '2px solid #a9a9a9', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* <GaugeChart id="gauge-chart" 
        nrOfLevels={30} 
        percent={fearAndGreedValue} 
        textColor={"#000000"} 
        needleColor={"#345243"} 
        needleBaseColor={"#345243"} 
        style={chartStyle} 
      /> */}
      <GaugeChart id="gauge-chart3"
        nrOfLevels={20}
        colors={["green", "red"]}
        arcWidth={0.3}
        percent={fearAndGreedValueExample}
        needleColor={"#345243"}
        needleBaseColor={"#345243"} 

        />
        {
            !isDashboard && (
                <p className='chart-info' style={{ marginTop: '20px', textAlign: 'center', width: '90%' }}> {/* Adjust width as necessary */}
                    The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data, including surveys, social media, volatility, market momentum, and volume among others.
                    <br/> The information has been provided here: <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
                </p>
            )   
        }
    </div>
  );
}

export default CryptoFearAndGreedIndex;

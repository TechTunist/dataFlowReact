// import React, { useEffect, useState } from 'react';
// import Plot from 'react-plotly.js';
// import { tokens } from "../theme";
// import { useTheme } from "@mui/material";
// import '../styling/bitcoinChart.css'

// const BitcoinRiskColor = ({ isDashboard = false }) => {
//     const [chartData, setChartData] = useState([]);
//     const theme = useTheme();
//     const colors = tokens(theme.palette.mode);
//     const [riskData, setRiskData] = useState([]);
    // const [layout, setLayout] = useState({
    //     title: 'Bitcoin Price vs. Risk Level',
    //     autosize: true,
    //     margin: { l: 50, r: 50, b: 30, t: 30, pad: 4 },
    //     plot_bgcolor: 'colors.primary[700]',
    //     paper_bgcolor: 'colors.primary[700]',
    //     font: { color: 'colors.primary[100]' },
    //     xaxis: { title: '' },
    //     yaxis: { title: 'Price (USD)', type: 'log' }
    // });

//     const [selectedRiskRanges, setSelectedRiskRanges] = useState(Array(5).fill(true)); // All ranges selected initially


    // const resetChartView = () => {
    //     setLayout({
    //         ...layout,
    //         // Resetting zoom and pan by setting the 'autorange' to true
    //         xaxis: { ...layout.xaxis, autorange: true },
    //         yaxis: { ...layout.yaxis, autorange: true }
    //     });
    // };

//     // Function to calculate the risk metric
//     const calculateRiskMetric = (data) => {
//         const movingAverage = data.map((item, index) => {
//             const start = Math.max(index - 373, 0);
//             const subset = data.slice(start, index + 1);
//             const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
//             return { ...item, MA: avg };
//         });

//         const movingAverageWithPreavg = movingAverage.map((item, index) => {
//             const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
//             return { ...item, Preavg: preavg };
//         });

//         const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
//         const preavgMin = Math.min(...preavgValues);
//         const preavgMax = Math.max(...preavgValues);

//         const normalizedRisk = movingAverageWithPreavg.map(item => ({
//             ...item,
//             Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
//         }));

//         return normalizedRisk;
//     };

//     // // Fetch and process data
//     // useEffect(() => {
//     //     const fetchData = async () => {
//     //         try {
//     //             const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
//     //             const data = await response.json();
//     //             const formattedData = data.map(item => ({
//     //                 date: item.date,
//     //                 value: parseFloat(item.close)
//     //             }));
//     //             const withRiskMetric = calculateRiskMetric(formattedData);

//     //             const filteredData = withRiskMetric.filter(item => {
//     //                 const risk = item.Risk;

//     //                 // check of corresponding risk range is selected
//     //                 return selectedRiskRanges[Math.floor(risk / 0.2)];
//     //             });
//     //             setChartData(filteredData);

//     //         } catch (error) {
//     //             console.error('Error fetching data: ', error);
//     //         }
//     //     };

//     //     fetchData();
//     // }, [selectedRiskRanges]);

//     const [rawData, setRawData] = useState([]);

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
//                 const data = await response.json();
//                 const formattedData = data.map(item => ({
//                     date: item.date,
//                     value: parseFloat(item.close)
//                 }));
//                 setRawData(formattedData);
//             } catch (error) {
//                 console.error('Error fetching data:', error);
//             }
//         };
//         fetchData();
//     }, []); // This effect runs only once when the component mounts

//     useEffect(() => {
//         if (rawData.length) {
//             const withRiskMetric = calculateRiskMetric(rawData);
//             setRiskData(withRiskMetric);
//         }
//     }, [rawData]); // Depends on rawData

//     useEffect(() => {
//         const filteredData = riskData.filter(item => {
//             const risk = item.Risk;
//             // Assuming selectedRiskRanges is an array of booleans indexed by risk ranges
//             return selectedRiskRanges[Math.floor(risk * 10 / 2)]; // Adjust according to how ranges are defined
//         });
//         setChartData(filteredData);
//     }, [riskData, selectedRiskRanges]); // This effect depends on riskData and selectedRiskRanges
    


//     // Adjust the size of the chart based on the context
//     // const chartSize = isDashboard ? { width: 720, height: 310 } : { width: 1200, height: 600 };
//     // const chartMargin = isDashboard ? { l: 50, r: 10, t: 45, b: 50 } : { l: 60, r: 10, t: 45, b: 60 };

//     return (
//         <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
//         <div className='chart-top-div' >
//             <div>
//                 {/* placeholder for styling */}
//             </div>
//             <div>
//                 {/* placeholder for styling */}
//             </div>
            
            // {
            //     !isDashboard && (
            //         <button onClick={resetChartView} className="button-reset">
            //             Reset Chart
            //         </button>
            //     )   
            // }
//         </div>
//         <div className="chart-container" style={{ 
//                     position: 'relative', 
//                     height: 'calc(100% - 40px)', 
//                     width: '100%', 
//                     border: '2px solid #a9a9a9' // Adds dark border with your specified color
//                     }}> 
//             {/* <div style={{ height: '100%', width: '100%', zIndex: 1 }} /> */}
//             <Plot
//                 data={[
//                     {
//                         type: 'scatter',
//                         mode: 'markers',
//                         x: chartData.map(d => d.date),
//                         y: chartData.map(d => d.value),
//                         marker: {
//                             color: chartData.map(d => d.Risk),
//                             colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
//                             cmin: 0,
//                             cmax: 1,
//                             size: 10,
//                         },
//                         text: chartData.map(d => `Date: ${d.date}<br>Price: ${d.value.toLocaleString()} USD<br>Risk: ${d.Risk.toFixed(2)}`),
//                         hoverinfo: 'text', // Tells Plotly to show the text content on hover
//                     },
//                 ]}
//                 layout={{
//                     title: isDashboard ? '' : 'Bitcoin Price vs. Risk Level',
//                     xaxis: { title: isDashboard ? '' : '' },
//                     yaxis: { title: isDashboard ? '' : 'Price (USD)', type: 'log' },
//                     autosize: true, // Make the plot responsive
//                     margin: {
//                         l: 50,
//                         r: 50,
//                         b: 30,
//                         t: 30,
//                         pad: 4
//                     },
//                     plot_bgcolor: colors.primary[700],
//                     paper_bgcolor: colors.primary[700],
//                     font: {
//                         color: colors.primary[100]
//                     },
//                 }}
                // config={{
                //     staticPlot: isDashboard, // Disable interaction when on the dashboard
                //     displayModeBar: !isDashboard, // Optionally hide the mode bar when on the dashboard
                //     displayModeBar: false,
                //     responsive: true
                // }}
//                 useResizeHandler={true} // Enable resize handler
//                 style={{ width: "100%", height: "100%" }} // Dynamically adjust size
//             />
//         </div>
//         {!isDashboard && (
//             <div className="risk-filter">
//                 <h2 >Filter by Risk Level</h2>
//                 <div className="risk-filter-inner">
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[0] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[0] = !selectedRiskRanges[0];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         0.0 - 1.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[1] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[1] = !selectedRiskRanges[1];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         2.0 - 3.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[2] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[2] = !selectedRiskRanges[2];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         4.0 - 5.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[3] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[3] = !selectedRiskRanges[3];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         6.0 - 7.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[4] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[4] = !selectedRiskRanges[4];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         8.0 - 1.0
//                     </span>
//                 </div>
//             </div>
//         )}

        // <div>
        //     {
        //         !isDashboard && (
        //             <p className='chart-info'>
        //                 The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
        //                 It does so by calculating the normalized logarithmic difference between the price and the moving average,
        //                 producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
        //                 This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
        //                 <br />
        //                 <br />
        //                 Initial Bottom: 2011-11-22 (0.22) - Major Top: 2013-04-10 (0.89) <br /> <br />
        //                 Mid Cycle Bottom: 2013-07-07 (0.46) - Major Top: 2013-11-30 (0.91) <br /> <br />
        //                 Bear Market Low: 2015-01-15 (0.22) - Bull Market Peak: 2017-12-17 (1.0) <br /> <br />
        //                 Bear Market Low: 2018-12-16 (0.00) - Mid-Cycle High: 2019-06-26 (0.69) <br /> <br />
        //                 Black Swan Crash: 2020-03-12 (0.15) - Bull Market Peak: 2021-02-21 (0.93) <br /> <br />
        //                 MidCycle Low: 2021-07-20 (0.36) - Second Bull Market Peak: 2021-10-20 (0.59) <br /> <br />
        //                 Bear Market Low: 2022-11-09 (0.02) - Local Top So Far: 2024-03-13 (0.73) <br /> <br />
        //             </p>
                        
        //         )   
        //     }
        // </div>
//     </div>
        
//     );
// };

// export default BitcoinRiskColor;












//////////// this code works but is super slow //////////////
// import React, { useEffect, useState, useRef } from 'react';
// import Plot from 'react-plotly.js';
// import { tokens } from "../theme";
// import { useTheme } from "@mui/material";
// import '../styling/bitcoinChart.css'

// const BitcoinRiskColor = ({ isDashboard = false }) => {
//     const [chartData, setChartData] = useState([]);
//     const theme = useTheme();
//     const colors = tokens(theme.palette.mode);
//     const [riskData, setRiskData] = useState([]);
//     const [layout, setLayout] = useState({
//         title: 'Bitcoin Price vs. Risk Level',
//         autosize: true,
//         margin: { l: 50, r: 50, b: 30, t: 30, pad: 4 },
//         plot_bgcolor: 'colors.primary[700]',
//         paper_bgcolor: 'colors.primary[700]',
//         font: { color: 'colors.primary[100]' },
//         xaxis: { title: '' },
//         yaxis: { title: 'Price (USD)', type: 'log' }
//     });

//     const [datasets, setDatasets] = useState([
//         { data: [], visible: true, label: "0.0 - 0.19" },
//         { data: [], visible: true, label: "0.2 - 0.39" },
//         { data: [], visible: true, label: "0.4 - 0.59" },
//         { data: [], visible: true, label: "0.6 - 0.79" },
//         { data: [], visible: true, label: "0.8 - 1.0" }
//     ]);

//     const layoutRef = useRef(layout);


//     const [selectedRiskRanges, setSelectedRiskRanges] = useState(Array(5).fill(true)); // All ranges selected initially
//     const [zoomState, setZoomState] = useState(null);


//     const handlePlotRelayout = (newLayout) => {
//         setLayout(prevLayout => ({
//             ...prevLayout,
//             // Check if newLayout.xaxis and newLayout.yaxis exist before trying to access their range
//             xaxis: newLayout.xaxis ? { ...prevLayout.xaxis, range: newLayout.xaxis.range } : prevLayout.xaxis,
//             yaxis: newLayout.yaxis ? { ...prevLayout.yaxis, range: newLayout.yaxis.range } : prevLayout.yaxis,
//         }));
//     };
    
    
    
//     const resetChartView = () => {
//         // Reset the layout to initial state or auto-ranging
//         setLayout({
//             ...layout,
//             xaxis: { ...layout.xaxis, autorange: true },
//             yaxis: { ...layout.yaxis, autorange: true }
//         });
//     };

//     // Function to calculate the risk metric
//     const calculateRiskMetric = (data) => {
//         const movingAverage = data.map((item, index) => {
//             const start = Math.max(index - 373, 0);
//             const subset = data.slice(start, index + 1);
//             const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
//             return { ...item, MA: avg };
//         });

//         const movingAverageWithPreavg = movingAverage.map((item, index) => {
//             const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
//             return { ...item, Preavg: preavg };
//         });

//         const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
//         const preavgMin = Math.min(...preavgValues);
//         const preavgMax = Math.max(...preavgValues);

//         const normalizedRisk = movingAverageWithPreavg.map(item => ({
//             ...item,
//             Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
//         }));

//         return normalizedRisk;
//     };

//     // // Fetch and process data
//     // useEffect(() => {
//     //     const fetchData = async () => {
//     //         try {
//     //             const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
//     //             const data = await response.json();
//     //             const formattedData = data.map(item => ({
//     //                 date: item.date,
//     //                 value: parseFloat(item.close)
//     //             }));
//     //             const withRiskMetric = calculateRiskMetric(formattedData);

//     //             const filteredData = withRiskMetric.filter(item => {
//     //                 const risk = item.Risk;

//     //                 // check of corresponding risk range is selected
//     //                 return selectedRiskRanges[Math.floor(risk / 0.2)];
//     //             });
//     //             setChartData(filteredData);

//     //         } catch (error) {
//     //             console.error('Error fetching data: ', error);
//     //         }
//     //     };

//     //     fetchData();
//     // }, [selectedRiskRanges]);

//     const [rawData, setRawData] = useState([]);

//     // useEffect(() => {
//     //     const fetchData = async () => {
//     //         try {
//     //             const response = await fetch('https://tunist.pythonanywhere.com/api/btc/price/');
//     //             const data = await response.json();
//     //             const formattedData = data.map(item => ({
//     //                 date: item.date,
//     //                 value: parseFloat(item.close)
//     //             }));
//     //             setRawData(formattedData);
//     //         } catch (error) {
//     //             console.error('Error fetching data:', error);
//     //         }
//     //     };
//     //     fetchData();
//     // }, []); // This effect runs only once when the component mounts

//     // useEffect(() => {
//     //     if (rawData.length) {
//     //         const withRiskMetric = calculateRiskMetric(rawData);
//     //         setRiskData(withRiskMetric);
//     //     }
//     // }, [rawData]); // Depends on rawData

//     // This useEffect handles fetching data and updating the local storage cache. It’s self-contained and correctly handles data fetching independently.
//     useEffect(() => {
//         const cacheKey = 'btcRiskData';
//         const cachedData = localStorage.getItem(cacheKey);
//         const today = new Date();
    
//         function fetchBtcData() {
//             // if no cached data is found, fetch new data
//             // Adjust the URL dynamically based on the selected altcoin
//             fetch('https://tunist.pythonanywhere.com/api/btc/price/')
//             .then(response => response.json())
//             .then(data => {
//                 const formattedData = data.map(item => ({
//                     time: item.date,
//                     value: parseFloat(item.close)
//                 }));             
                
//                 const withRiskMetric = calculateRiskMetric(formattedData);

//                 localStorage.setItem(cacheKey, JSON.stringify(withRiskMetric));
//                 setChartData(withRiskMetric);

//             })
//             .catch(error => {
//                 console.error('Error fetching data: ', error);
//             });
//         }
    
//         function updateDatasets(data) {
//             const riskBands = [0.19, 0.39, 0.59, 0.79, 1.0]; // Upper limits of each risk band
//             const newDatasets = riskBands.map((upperLimit, index) => ({
//                 data: data.filter(d => d.Risk <= upperLimit && (index === 0 || d.Risk > riskBands[index - 1])),
//                 visible: true,
//                 label: `${index === 0 ? '0.0' : riskBands[index - 0.1] + 0.01} - ${upperLimit}`
//             }));
    
//             setDatasets(newDatasets);
//             console.log(newDatasets);
//             // console.log(newDatasets[0].data[0].Risk);
//             // console.log(newDatasets[1].data[1].Risk);
//             // console.log(newDatasets[2].data[2].Risk);
//             // console.log(newDatasets[3].data[3].Risk);
//             // console.log(newDatasets[4].data[4].Risk);
//         }
    
//         if (cachedData) {
//             const parsedData = JSON.parse(cachedData);
//             const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
//             if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
//                 updateDatasets(JSON.parse(cachedData));
//             } else {
//                 fetchBtcData();
//             }
//         } else {
//             fetchBtcData();
//         }
//     }, []);
    


//     // Adjust the size of the chart based on the context
//     // const chartSize = isDashboard ? { width: 720, height: 310 } : { width: 1200, height: 600 };
//     // const chartMargin = isDashboard ? { l: 50, r: 10, t: 45, b: 50 } : { l: 60, r: 10, t: 45, b: 60 };

//     // get current zoom data for reapplication after chart rerender
//     // const handleLayoutChange = (newLayout) => {
//     //     if (newLayout.xaxis && newLayout.yaxis) {
//     //       // Update layout with captured zoom ranges directly
//     //       setLayout({
//     //         ...layout,
//     //         xaxis: { ...layout.xaxis, range: newLayout.xaxis.range },
//     //         yaxis: { ...layout.yaxis, range: newLayout.yaxis.range },
//     //       });
//     //     }
//     //   };

//     const toggleVisibility = index => {
//     const newDatasets = datasets.map((ds, i) => {
//         if (i === index) {
//             return { ...ds, visible: !ds.visible };
//         }
//         return ds;
//     });
//     setDatasets(newDatasets);
// };
      
//     useEffect(() => {
//         const newData = riskData.map(item => {
//             const risk = item.Risk * 10; // Scale risk to 0-10
//             const index = Math.floor(risk / 2); // Determine the appropriate dataset
//             return { ...item, datasetIndex: index };
//         });

//         const newDatasets = datasets.map(ds => ({
//             ...ds,
//             data: newData.filter(item => item.datasetIndex === datasets.indexOf(ds))
//         }));

//         setDatasets(newDatasets);
//     }, [riskData]);

//     return (
//         <div style={{ height: '100%' }}> {/* Set a specific height for the entire container */}
//         <div className='chart-top-div' >
//             <div>
//                 {/* placeholder for styling */}
//             </div>
//             <div>
//                 {/* placeholder for styling */}
//             </div>
            
//             {
//                 !isDashboard && (
//                     <button onClick={resetChartView} className="button-reset">
//                         Reset Chart
//                     </button>
//                 )   
//             }
//         </div>
//         <div className="chart-container" style={{ 
//                     position: 'relative', 
//                     height: 'calc(100% - 40px)', 
//                     width: '100%', 
//                     border: '2px solid #a9a9a9' // Adds dark border with your specified color
//                     }}> 
//             {/* <div style={{ height: '100%', width: '100%', zIndex: 1 }} /> */}
//             {/* <Plot
//                 data={chartData.map(d => ({
//                     type: 'scatter',
//                     mode: 'markers',
//                     x: [d.date],
//                     y: [d.value],
//                     marker: {
//                         color: [d.Risk],
//                         colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
//                         cmin: 0,
//                         cmax: 1,
//                         size: 10,
//                     },
//                     text: `Date: ${d.date}<br>Price: ${d.value.toLocaleString()} USD<br>Risk: ${d.Risk.toFixed(2)}`,
//                     hoverinfo: 'text',
//                 }))}
//                 layout={layout}
//                 onRelayout={handlePlotRelayout}
//                 config={{
//                     responsive: true,
//                     displayModeBar: true
//                 }}
//                 useResizeHandler={true}
//                 style={{ width: "100%", height: "100%" }}
//             /> */}

//             <Plot
//                 data={datasets.filter(dataset => dataset.visible).map(dataset => ({
//                     type: 'scatter',
//                     mode: 'markers',
//                     x: dataset.data.map(d => d.time),
//                     y: dataset.data.map(d => d.value),
//                     marker: {
//                         color: dataset.data.map(d => d.Risk),
//                         colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
//                         cmin: 0,
//                         cmax: 1,
//                         size: 10,
//                     },
//                     text: dataset.data.map(d => `Date: ${d.time}<br>Price: ${d.value.toLocaleString()} USD<br>Risk: ${d.Risk.toFixed(2)}`),
//                     hoverinfo: 'text',
//                     name: dataset.label // This adds a legend entry for each dataset
//                 }))}
//                 layout={layout}
//                 onRelayout={handlePlotRelayout}
//                 config={{
//                     responsive: true,
//                     displayModeBar: true
//                 }}
//                 useResizeHandler={true}
//                 style={{ width: "100%", height: "100%" }}
//             />



//         </div>
//         {!isDashboard && (
//             <div className="risk-filter">
//                 <h2 >Filter by Risk Level</h2>
//                 <div className="risk-filter-inner">
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[0] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[0] = !selectedRiskRanges[0];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         0.0 - 1.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[1] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[1] = !selectedRiskRanges[1];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         2.0 - 3.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[2] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[2] = !selectedRiskRanges[2];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         4.0 - 5.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[3] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[3] = !selectedRiskRanges[3];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         6.0 - 7.9
//                     </span>
//                     <span
//                         className="risk-range"
//                         style={{
//                         color: selectedRiskRanges[4] ? colors.greenAccent[500] : 'grey',
//                         }}
//                         onClick={() => {
//                         const updatedRanges = [...selectedRiskRanges];
//                         updatedRanges[4] = !selectedRiskRanges[4];
//                         setSelectedRiskRanges(updatedRanges);
//                         }}
//                     >
//                         8.0 - 1.0
//                     </span>
//                 </div>
//             </div>
//         )}

//         <div>
//             {
//                 !isDashboard && (
//                     <p className='chart-info'>
//                         The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
//                         It does so by calculating the normalized logarithmic difference between the price and the moving average,
//                         producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
//                         This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
//                         <br />
//                         <br />
//                         Initial Bottom: 2011-11-22 (0.22) - Major Top: 2013-04-10 (0.89) <br /> <br />
//                         Mid Cycle Bottom: 2013-07-07 (0.46) - Major Top: 2013-11-30 (0.91) <br /> <br />
//                         Bear Market Low: 2015-01-15 (0.22) - Bull Market Peak: 2017-12-17 (1.0) <br /> <br />
//                         Bear Market Low: 2018-12-16 (0.00) - Mid-Cycle High: 2019-06-26 (0.69) <br /> <br />
//                         Black Swan Crash: 2020-03-12 (0.15) - Bull Market Peak: 2021-02-21 (0.93) <br /> <br />
//                         MidCycle Low: 2021-07-20 (0.36) - Second Bull Market Peak: 2021-10-20 (0.59) <br /> <br />
//                         Bear Market Low: 2022-11-09 (0.02) - Local Top So Far: 2024-03-13 (0.73) <br /> <br />
//                     </p>
                        
//                 )   
//             }
//         </div>
//     </div>
        
//     );
// };

// export default BitcoinRiskColor;


















import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';

const BitcoinRiskColor = ({ isDashboard = false }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [layout, setLayout] = useState({
        title: 'Bitcoin Price vs. Risk Level',
        autosize: true,
        margin: { l: 50, r: 50, b: 30, t: 30, pad: 4 },
        plot_bgcolor: 'colors.primary[700]',
        paper_bgcolor: 'colors.primary[700]',
        font: { color: 'colors.primary[100]' },
        xaxis: { title: '' },
        yaxis: { title: 'Price (USD)', type: 'log' }
    });

    const resetChartView = () => {
        setLayout({
            ...layout,
            // Resetting zoom and pan by setting the 'autorange' to true
            xaxis: { ...layout.xaxis, autorange: true },
            yaxis: { ...layout.yaxis, autorange: true }
        });
    };

    const [datasets, setDatasets] = useState([
        { data: [], visible: true, label: "0.0 - 0.19" },
        { data: [], visible: true, label: "0.2 - 0.39" },
        { data: [], visible: true, label: "0.4 - 0.59" },
        { data: [], visible: true, label: "0.6 - 0.79" },
        { data: [], visible: true, label: "0.8 - 1.0" }
    ]);

        const calculateRiskMetric = (data) => {
            const movingAverage = data.map((item, index) => {
            const start = Math.max(index - 373, 0);
            const subset = data.slice(start, index + 1);
            const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
            return { ...item, MA: avg };
        });

        const movingAverageWithPreavg = movingAverage.map((item, index) => {
            const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
            return { ...item, Preavg: preavg };
        });

        const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
        const preavgMin = Math.min(...preavgValues);
        const preavgMax = Math.max(...preavgValues);

        const normalizedRisk = movingAverageWithPreavg.map(item => ({
            ...item,
            Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin)
        }));

        return normalizedRisk;
    };

    useEffect(() => {
        const cacheKey = 'btcRiskData';
        const cachedData = localStorage.getItem(cacheKey);
        const today = new Date();
    
        function fetchBtcData() {
            // if no cached data is found, fetch new data
            // Adjust the URL dynamically based on the selected altcoin
            fetch('https://tunist.pythonanywhere.com/api/btc/price/')
            .then(response => response.json())
            .then(data => {
                const formattedData = data.map(item => ({
                    time: item.date,
                    value: parseFloat(item.close)
                }));             
                
                const withRiskMetric = calculateRiskMetric(formattedData);

                localStorage.setItem(cacheKey, JSON.stringify(withRiskMetric));
                updateDatasets(withRiskMetric);

            })
            .catch(error => {
                console.error('Error fetching data: ', error);
            });
        }
    
        function updateDatasets(data) {
            const riskBands = [0.19, 0.39, 0.59, 0.79, 1.0]; // Upper limits of each risk band
            const newDatasets = riskBands.map((upperLimit, index) => ({
                data: data.filter(d => d.Risk <= upperLimit && (index === 0 || d.Risk > riskBands[index - 1])),
                visible: true,
                label: `${index === 0 ? '0.0' : riskBands[index - 0.1] + 0.01} - ${upperLimit}`
            }));
    
            setDatasets(newDatasets);
            // console.log(newDatasets);
            // console.log(newDatasets[0].data[0].Risk);
            // console.log(newDatasets[1].data[1].Risk);
            // console.log(newDatasets[2].data[2].Risk);
            // console.log(newDatasets[3].data[3].Risk);
            // console.log(newDatasets[4].data[4].Risk);
        }
    
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const lastCachedDate = new Date(parsedData[parsedData.length - 1].time);
            if (lastCachedDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0)) {
                updateDatasets(JSON.parse(cachedData));
            } else {
                fetchBtcData();
            }
        } else {
            fetchBtcData();
        }
    }, []);

    const updateDatasets = (data) => {
        const riskBands = [0.19, 0.39, 0.59, 0.79, 1.0]; // Upper limits of each risk band
        const newDatasets = riskBands.map((upperLimit, index) => ({
            ...datasets[index],
            data: data.filter(d => {
                const risk = d.Risk * 10 / 2;
                return risk >= (index === 0 ? 0 : riskBands[index - 1]) && risk < upperLimit;
            })
        }));
        setDatasets(newDatasets);
    };

    const toggleVisibility = (index) => {
        const newDatasets = datasets.map((ds, i) => ({
            ...ds,
            visible: i === index ? !ds.visible : ds.visible
        }));
        setDatasets(newDatasets);
    };

    return (
        <div style={{ height: '100%' }}>
            <div className='chart-top-div'>
                {/* Interactivity toggles for each dataset */}
                <div className="risk-filter">
                    {/* <div className="risk-filter-inner">
                        {datasets.map((dataset, index) => (
                            <button
                                key={index}
                                style={{
                                    color: dataset.visible ? 'black' : 'grey',
                                    backgroundColor: dataset.visible ? colors.greenAccent[500] : 'lightgrey',
                                    border: `1px solid ${colors.greenAccent[500]}`
                                }}
                                onClick={() => toggleVisibility(index)}
                            >
                                {dataset.label}
                            </button>
                        ))}
                    </div> */}
                </div>
                <div>
                    {/* placeholder for styling */}
                    { !isDashboard && (
                        <p>
                            if i add the plot for bitcoin styling then the chart y axis shouldnt reset after the risk data is hidden
                        which currently confuses the use as the datapoints change as the y axis resets
                        </p>
                    )}
                    
                </div>
                <div>
                    {
                        !isDashboard && (
                            <button onClick={resetChartView} className="button-reset">
                                Reset Chart
                            </button>
                        )   
                    }
                </div>
            </div>
            <div className="chart-container" style={{ position: 'relative', height: 'calc(100% - 40px)', width: '100%', border: '2px solid #a9a9a9' }}>
                <Plot
                    data={datasets.filter(dataset => dataset.visible).map(dataset => ({
                        type: 'scatter',
                        mode: 'markers',
                        x: dataset.data.map(d => d.time),
                        y: dataset.data.map(d => d.value),
                        marker: {
                            color: dataset.data.map(d => d.Risk),
                            colorscale: theme.palette.mode === 'dark' ? 'RdBu' : 'Viridis',
                            cmin: 0,
                            cmax: 1,
                            size: 10,
                        },
                        name: dataset.label,
                        hoverinfo: 'text'
                    }))}
                    layout={{
                        title: isDashboard ? '' : 'Bitcoin Price vs. Risk Level',
                        xaxis: { title: isDashboard ? '' : '' },
                        yaxis: { title: isDashboard ? '' : 'Price (USD)', type: 'log' },
                        autosize: true,
                        margin: { l: 50, r: 50, b: 30, t: 30, pad: 4 },
                        plot_bgcolor: colors.primary[700],
                        paper_bgcolor: colors.primary[700],
                        font: { color: colors.primary[100] },
    
                    }}
                    config={{
                        staticPlot: isDashboard, // Disable interaction when on the dashboard
                        displayModeBar: !isDashboard, // Optionally hide the mode bar when on the dashboard
                        displayModeBar: false,
                        responsive: true
                    }}
                    useResizeHandler={true}
                    style={{ width: "100%", height: "100%" }}
                />
            </div>
            <div>
            {
                !isDashboard && (
                    <p className='chart-info'>
                        The risk metric assesses Bitcoin's investment risk over time by comparing its daily prices to a 374-day moving average.
                        It does so by calculating the normalized logarithmic difference between the price and the moving average,
                        producing a score between 0 and 1. A higher score indicates higher risk, and a lower score indicates lower risk.
                        This method provides a simplified view of when it might be riskier or safer to invest in Bitcoin based on historical price movements.
                        <br />
                        <br />
                        Initial Bottom: 2011-11-22 (0.22) - Major Top: 2013-04-10 (0.89) <br /> <br />
                        Mid Cycle Bottom: 2013-07-07 (0.46) - Major Top: 2013-11-30 (0.91) <br /> <br />
                        Bear Market Low: 2015-01-15 (0.22) - Bull Market Peak: 2017-12-17 (1.0) <br /> <br />
                        Bear Market Low: 2018-12-16 (0.00) - Mid-Cycle High: 2019-06-26 (0.69) <br /> <br />
                        Black Swan Crash: 2020-03-12 (0.15) - Bull Market Peak: 2021-02-21 (0.93) <br /> <br />
                        MidCycle Low: 2021-07-20 (0.36) - Second Bull Market Peak: 2021-10-20 (0.59) <br /> <br />
                        Bear Market Low: 2022-11-09 (0.02) - Local Top So Far: 2024-03-13 (0.73) <br /> <br />
                    </p>
                        
                )   
            }
        </div>
        </div>
    );
};

export default BitcoinRiskColor;

function CryptoFearAndGreedIndex({ isDashboard }) {
    // Define styles for when the component is on the dashboard
    const dashboardStyle = {
        width: '50%', 
        height: '50%', 
        maxWidth: '50%',
        minWidth: '300px' // Ensure the image does not exceed its container
    };

    // Define alternative styles for non-dashboard view or leave as undefined for default behavior
    const defaultStyle = {
        width: '90%', // Allow the image to fill 90% of its parent container
        height: 'auto', // Maintain aspect ratio
        maxWidth: '800px', // Limit maximum width to prevent the image from being too large
        margin: 'auto', // Center the image within its parent container
    };

    return (
        <div style={{ border: '2px solid #a9a9a9', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
                src="https://alternative.me/crypto/fear-and-greed-index.png" 
                alt="Latest Crypto Fear & Greed Index"
                style={isDashboard ? dashboardStyle : defaultStyle}
            />
            {
                !isDashboard && (
                    <p style={{ marginTop: '20px', textAlign: 'center', width: '90%' }}> {/* Adjust width as necessary */}
                        The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data, including surveys, social media, volatility, market momentum, and volume among others.
                        <br/> The information has been provided here: <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
                    </p>
                )   
            }
        </div>
    );
}

export default CryptoFearAndGreedIndex;
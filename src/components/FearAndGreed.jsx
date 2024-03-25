function CryptoFearAndGreedIndex({ isDashboard }) {
    // Define styles for when the component is on the dashboard
    const dashboardStyle = {
        width: '50%', 
        height: '50%', 
        maxWidth: '50%', // Ensure the image does not exceed its container
    };

    // Define alternative styles or leave as undefined for default behavior
    const defaultStyle = {
        // Styles when not displayed on the dashboard
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
                src="https://alternative.me/crypto/fear-and-greed-index.png" 
                alt="Latest Crypto Fear & Greed Index"
                style={isDashboard ? dashboardStyle : defaultStyle}
            />
            {
                !isDashboard && (
                    <p style={{ marginTop: '20px', textAlign: 'center', width: '90%' }}> {/* Adjust width as necessary */}
                        The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data, <br/> including surveys, social media, volatility, market momentum, and volume among others.
                        <br/> The information has been provided here: <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
                    </p>
                )   
            }
        </div>
    );
}

export default CryptoFearAndGreedIndex;

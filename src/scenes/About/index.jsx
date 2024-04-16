import '../../styling/bitcoinChart.css';

import { tokens } from "../../theme";

const About = () => {
    return (
        <div className='about-page'>
            <h3>This app attempts to concentrate the most popular, accurate, and useful charts and indicators in a convenient dashboard,
                with the objective of helping retail investors arm themselves with the knowledge to make better informed decisions.</h3>
            <h1>App Creator:</h1>
            <h2>Matthew Jackson</h2>
            
                I hold an undergrad degree in Computer Science and have been involved in crypto since 2020.
                The thing that really got me interested in financial markets was the infamous GameStop shortsqueeze,
                but like most retail investors, I was too late to the party and ended up losing money rather than making any. <br /><br />
                This experience taught me a lot about how the existing financial system can be abused by people in positions of power and influence,
                and it was always the little guy who was on the receiving end. Even companies that were purportedly there to help the average private investor,
                like Robinhood, appeared to be on the side of the big money. <br /><br />
                This is where I started learning about Bitcoin and its distributed, permissionless method of transacting that cut out
                the systems of traditional finance entirely. It helped that we were in the middle of the 2020 bull run around the previous all-time high of $19k.<br /><br />
                As many newcomers to the space, I started consuming a lot of content from YouTube, (of which there is a lot), but not having any experience or 
                knowledge of the cryptosphere it was easy to be misled by moonboys and shills with their speculative price predictions.
                After a few years of personal growth and research, I now consume content from one or two YouTubers that tend to keep their content as factual as possible
                based on the data we have available to us. <br /><br />
                Now we do have a few boom and bust cycles under our belt which have increased the number of datapoints on which we can perform analysis,
                certain indicators have been created that appear to be able to help us make better investment decisions and come up with our own strategies, 
                taking the emotion out of the decision-making process and taking a data-centric approach.
                Many of these indicators have been fit to or created in response to historical data, and have stood up to at least one market cycle. 
            
        </div>
    );
};

export default About;

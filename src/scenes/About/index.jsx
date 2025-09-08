import '../../styling/bitcoinChart.css';

import { tokens } from "../../theme";
import { useTheme } from "@mui/material";

const About = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    return (
        <div
            className='about-page'
            style={{
                backgroundColor: colors.primary[500],
                color: colors.primary[200]}}>
            <h3 style={{
                color: '#4cceac'
            }}>
                This app attempts to concentrate the most popular, accurate, and useful charts and indicators in a convenient dashboard,
                with the objective of helping retail investors arm themselves with the knowledge to make better informed decisions.</h3>
            <h2 style={{
                color: '868dfb'
            }}>
            App Creator:</h2>
            <h1 style={{
                color: '4cceac'
            }}>
                Matthew Jackson</h1>
            
                I worked as an Architectural Assistant after leaving school, went back into education in 2020 studying BSc Computer Science, at the same time becoming an on-call firefighter.
                2020 was also when I became interested in investing and crypto.
                The thing that really got me interested in financial markets was the infamous GameStop shortsqueeze,
                but like most new retail investors, I was too late to the party and ended up losing money rather than making any. <br /><br />

                This experience stung pretty hard, and I found myself looking around for other ways I could try and get back in the green. This was January 2021, when the 
                world had panicked itself into frenzy over the previous 18 months, money printers were in overdrive and asset prices were being artificially inflated as a result, creating the perfect storm for Bitcoin and crypto in general.<br /><br />

                This was my second experience of an asset bubble in just a couple of months, but unfortunately I was a slow learner and ended up watching my face melting gains ebb away when the bear market rolled around.
                Success in investing often comes down to formulating a strategy, and sticking to it. This strategy should be based around identifying times to buy, times to hold and times to sell.
                I was aware of tools available that were tailor made for helping investors figure these things out, but a lot of them were far too expensive for me to spend money on their subscriptions
                when I could have just invested the money instead. <br /><br />

                This is why I created Cryptological. First  Ijust wanted to create indicators and charts for myself that I could use to make smarter decisions, but as the project grew, I realised that I could offer
                these tools to other investors llike myself that were also looking for ways they could make better decisions, at a price that would not eat into their funds available for investment.
                <br /><br />
            
        </div>
    );
};

export default About;
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
                This app attempts gives you the opportunity to make more informed investment decisions.</h3>
            <h2 style={{
                color: '868dfb'
            }}>
            App Creator:</h2>
            <h1 style={{
                color: '4cceac'
            }}>
                Matthew Jackson</h1>
            
                After finishing A-levels in 2003 I started an apprenticeship at an architectural practice, goin on to become an important member of a small team, taking on all duties.
                I decided to make a change in 2019 by studying a BSc Computer Science degree, while at the same time becoming an on-call firefighter for my local town of Whitstable, Kent.
                <br /><br />
                2020 was a semimal year for a lot of us for different reasons, but aside from the tyrannical authoritarianism imposed by governments around
                the world acting like corporations in the limit with a monopoly on violence, the other thing that really got me riled up was the infamous GameStop shortsqueeze.
                This sent me on a journey of discovery back to 2008 and beyond, trying ot understand how the economy became what it is and what even is the concept of money.
                I was too late to the Gmaestop party and ended up becoming exit liquidity for speculators who were smarter than me. 
                <br /><br />
                At this point the genie ws out of the bottle and I was out there looking for other investment opportunities, which is where Bitcoin entered the chat.
                This was January 2021, after the world had panicked itself into frenzy over the previous 18 months, giving out stimulus checks and printing money like never before
                after a decade of zero interest rates.
                The money printers were in overdrive and asset prices were being artificially inflated as a result, creating the perfect storm for Bitcoin and other crypto assets higher up the risk curve.
                <br /><br />
                This was my second experience of an asset bubble in just a couple of months, but unfortunately I was a slow learner and ended up watching my face melting gains ebb away when the bear market rolled around.
                <br /><br />
                Success in investing often comes down to formulating a strategy, and sticking to it. This strategy should be based around identifying times to buy, times to hold and times to sell.
                I was aware of tools available that were tailor made for helping investors figure these things out, but a lot of them were far too expensive for me to spend money on their subscriptions
                when I could have just invested the money instead.
                <br /><br />
                This is why I created Cryptological. First I just wanted to create indicators and charts for myself that I could use to make smarter decisions, but as the project grew, I realised that I could offer
                these tools to other investors llike myself that were also looking for ways they could make better decisions, at a price that would not eat into their funds available for investment.
                <br /><br />
            
        </div>
    );
};

export default About;
import React from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import HubIcon from "@mui/icons-material/Hub";
import GavelIcon from "@mui/icons-material/Gavel";
import LinkIcon from "@mui/icons-material/Link";
import { Link } from "react-router-dom";
import { useTheme } from "@mui/material";
import { tokens } from "../theme";
import Navbar from "./global/SplashNavBar.jsx";
import SeoHead from "../components/SeoHead";
import SeoPublicFooter from "./seo/SeoPublicFooter";
import { SEO_PAGES } from "../seo/staticPageContent";
import TrackedSignupLink from "../components/marketing/TrackedSignupLink";
import StickySignupCta from "../components/marketing/StickySignupCta";
import HundredDayWindowBanner, { HUNDRED_DAY_WINDOW_BANNER_HEIGHT } from "../components/marketing/HundredDayWindowBanner";
import FreePremiumAccessSticker from "../components/marketing/FreePremiumAccessSticker";
import {
  getHeroPricingHint,
  isOpenAccessPromoActive,
  OPEN_ACCESS_PROMO,
} from "../config/openAccessPromo";
import "../styling/splashPage.css";

const FREE_SIGNUP = "/login-signup?mode=signup";
const NAVBAR_HEIGHT = { xs: 64, sm: 80 };

const whitepaperSeo = SEO_PAGES["bitcoin-whitepaper"];

const WHITEPAPER_SECTIONS = [
  {
    id: "intro",
    title: "1. Introduction, money without a middleman",
    summary: "Satoshi Nakamoto's opening argument is simple: online commerce still depends on financial institutions we are forced to trust.",
    body: [
      "Today, when you pay online, a bank, card network, or payment processor sits in the middle. They can reverse charges, freeze accounts, or refuse service, sometimes with little explanation.",
      "Bitcoin was proposed as peer-to-peer electronic cash: you send value directly to another person over the internet, the same way you might hand someone cash in person, without asking a company for permission first.",
      "The whitepaper is not a marketing document. It is an engineering blueprint for replacing that trusted middleman with mathematics, cryptography, and a network of independent participants.",
    ],
  },
  {
    id: "transactions",
    title: "2. Transactions, digital signatures as proof",
    summary: "Ownership is defined by cryptographic keys, not by an account database at a bank.",
    body: [
      "Each Bitcoin transfer is a chain of digital signatures. If you control a private key, you can authorise a payment. Everyone else can verify the signature without knowing your secret.",
      "This is the layman's version of \"not your keys, not your coins.\" Custodial platforms hold keys on your behalf, convenient, but you are trusting them exactly like a bank.",
      "Signatures solve authorisation. They do not, by themselves, solve the harder problem: how do we prevent the same coin being spent twice?",
    ],
  },
  {
    id: "timestamp",
    title: "3. Timestamp server, ordering history publicly",
    summary: "History is recorded in blocks linked together, forming a chain anyone can audit.",
    body: [
      "Imagine a public ledger where each page of transactions is stamped with the time and glued to the previous page. Change one page and every page after it looks wrong.",
      "That is the blockchain idea in plain language: a shared timeline of who paid whom, maintained cooperatively rather than stored in one company's database.",
      "You do not need to trust a brand. You can verify the record yourself, or trust software that does it for you.",
    ],
  },
  {
    id: "pow",
    title: "4. Proof-of-work, making rewriting history expensive",
    summary: "Computers compete to solve puzzles so that rewriting the past costs real-world resources.",
    body: [
      "If updating the ledger were free, an attacker could fabricate an alternative history where they never spent their coins. Proof-of-work makes that attack costly.",
      "Miners bundle transactions into blocks and expend electricity and hardware to publish them. The honest chain with the most work invested becomes the accepted history.",
      "This is not perfect magic, it is economic security. Stealing or rewriting Bitcoin at scale means outspending the rest of the network, which grows harder as participation increases.",
    ],
  },
  {
    id: "network",
    title: "5. Network, rules enforced by many nodes",
    summary: "No single CEO can change the rules overnight if the community of nodes refuses.",
    body: [
      "Participants run software that checks every transaction against the rules: valid signatures, no double spends, correct issuance schedule.",
      "New transactions propagate across the globe in seconds. Nodes reject invalid data rather than politely trusting a central operator.",
      "This is why Bitcoin resists arbitrary policy changes: consensus is distributed. Influence is earned through operation and agreement, not through owning the database server.",
    ],
  },
  {
    id: "incentive",
    title: "6. Incentive, why strangers help secure the system",
    summary: "People are paid in newly issued bitcoin and fees to play by the rules.",
    body: [
      "Rational participants earn more by securing the network than by attacking it. Block rewards and transaction fees align self-interest with honest behaviour.",
      "Issuance decreases on a predictable schedule until no new coins are created, contrasting with fiat currencies whose supply can expand when policymakers choose.",
      "The incentive design is why the system can run without a government guarantee or corporate sponsor.",
    ],
  },
  {
    id: "spv",
    title: "7. Simplified payment verification, light wallets",
    summary: "You do not need a full copy of history to accept a payment, only strong evidence it was included.",
    body: [
      "Everyday users can rely on lightweight wallets that check block headers and Merkle proofs rather than downloading the entire chain.",
      "This keeps mobile and browser wallets practical while still anchoring trust to the same shared history.",
    ],
  },
  {
    id: "privacy",
    title: "8. Privacy, pseudonymity, not anonymity",
    summary: "Bitcoin does not put your name on the ledger, but the flow of funds is public.",
    body: [
      "Addresses are random-looking strings, not passports. Privacy is closer to using a public nickname than to a Swiss numbered account.",
      "The whitepaper recommends using fresh addresses and not reusing them. Transparency and privacy trade off, a design choice very different from banking secrecy.",
    ],
  },
  {
    id: "conclusion",
    title: "9. Conclusion, a system that does not depend on trust alone",
    summary: "Bitcoin proposes trust minimisation: assume participants may cheat, then make cheating unprofitable.",
    body: [
      "Traditional finance asks you to trust institutions, regulators, and courts. Bitcoin asks you to verify mathematics and observe incentives.",
      "That spirit, permissionless, auditable, resistant to silent debasement, is what many people mean when they say \"sound money\" in a digital age.",
    ],
  },
];

const OTHER_NETWORKS = [
  {
    title: "Shared DNA",
    text: "Many cryptographic networks reuse the same building blocks: public-key identities, replicated ledgers, and consensus mechanisms that let strangers agree on a single history without a central clerk.",
  },
  {
    title: "Different goals",
    text: "Some projects optimise for faster payments, programmability (smart contracts), or privacy enhancements. The engineering trade-offs differ even when the vocabulary sounds similar.",
  },
  {
    title: "Not all are alternatives in the same sense",
    text: "A token run by a small committee, a company treasury, or unclear monetary policy may be innovative software, but it may not offer the same credible neutrality Bitcoin aimed for. Judge each network by who can change the rules, freeze balances, or inflate supply.",
  },
];

const BitcoinWhitepaper = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const promoActive = isOpenAccessPromoActive();

  const sectionCardSx = {
    backgroundColor: colors.primary[800],
    border: `1px solid ${colors.primary[600]}`,
    height: "100%",
  };

  return (
    <Box
      className="splash-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: colors.primary[900],
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        pt: {
          xs: `${HUNDRED_DAY_WINDOW_BANNER_HEIGHT.xs + NAVBAR_HEIGHT.xs}px`,
          sm: `${HUNDRED_DAY_WINDOW_BANNER_HEIGHT.sm + NAVBAR_HEIGHT.sm}px`,
        },
      }}
    >
      <SeoHead
        title={whitepaperSeo.title}
        description={whitepaperSeo.description}
        path="/bitcoin-whitepaper"
        keywords={whitepaperSeo.keywords}
      />
      <HundredDayWindowBanner colors={colors} />
      <Navbar colors={colors} topOffset={HUNDRED_DAY_WINDOW_BANNER_HEIGHT} />
      <StickySignupCta
        colors={colors}
        signupPath={FREE_SIGNUP}
        label={promoActive ? "Sign up free (limited access)" : "Get cycle charts free"}
      />

      {/* Hero */}
      <Box
        component="section"
        sx={{
          position: "relative",
          width: "100%",
          pt: { xs: 4, sm: 6 },
          pb: { xs: 6, md: 8 },
          background: `linear-gradient(180deg, ${colors.primary[900]} 0%, ${colors.primary[800]} 100%)`,
        }}
      >
        <FreePremiumAccessSticker corner="top-right" />
        <Container maxWidth="md">
          <Chip
            label={
              promoActive
                ? OPEN_ACCESS_PROMO.limitedAccessChip
                : "Public guide · No account required"
            }
            sx={{
              mb: 2,
              backgroundColor: colors.greenAccent[800],
              color: colors.greenAccent[300],
              fontWeight: 600,
            }}
          />
          <Typography
            component="h1"
            variant="h1"
            sx={{
              color: colors.grey[100],
              fontWeight: "bold",
              fontSize: { xs: "2rem", sm: "2.75rem", md: "3.25rem" },
              lineHeight: 1.2,
              mb: 2,
            }}
          >
            {whitepaperSeo.h1}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: colors.grey[300],
              fontWeight: 400,
              fontSize: { xs: "1.05rem", md: "1.25rem" },
              lineHeight: 1.7,
              mb: 2,
            }}
          >
            In October 2008, as faith in banks was collapsing, Satoshi Nakamoto published a nine-page paper describing
            electronic cash that does not require trusting a financial institution. This page explains that vision for
            anyone curious about money, power, and why cryptographic networks matter, no jargon required to start.
          </Typography>
          {promoActive && (
            <Typography sx={{ color: colors.grey[400], mb: 3, fontSize: "0.95rem", lineHeight: 1.6 }}>
              {OPEN_ACCESS_PROMO.bannerSubtext} {getHeroPricingHint(true)}
            </Typography>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <Button
              component={TrackedSignupLink}
              to={FREE_SIGNUP}
              location="whitepaper-hero"
              variant="contained"
              size="large"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                fontWeight: "bold",
                px: 4,
                "&:hover": { backgroundColor: colors.greenAccent[400] },
              }}
            >
              {promoActive ? "Sign up free with email" : "Create free account"}
            </Button>
            <Button
              component={Link}
              to="/#market-pulse"
              variant="outlined"
              sx={{
                color: colors.greenAccent[400],
                borderColor: colors.greenAccent[500],
                fontWeight: "bold",
                "&:hover": { borderColor: colors.greenAccent[300], backgroundColor: `${colors.greenAccent[900]}44` },
              }}
            >
              Public market pulse
            </Button>
            <Button
              component={Link}
              to="/chart-gallery"
              variant="outlined"
              sx={{
                color: colors.greenAccent[400],
                borderColor: colors.greenAccent[500],
                fontWeight: "bold",
                "&:hover": { borderColor: colors.greenAccent[300], backgroundColor: `${colors.greenAccent[900]}44` },
              }}
            >
              Chart gallery
            </Button>
            <Button
              component="a"
              href="https://bitcoin.org/bitcoin.pdf"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: colors.grey[400],
                textTransform: "none",
                "&:hover": { color: colors.grey[200], backgroundColor: "transparent" },
              }}
            >
              Read original PDF →
            </Button>
          </Stack>
          <Typography sx={{ color: colors.grey[500], mt: 2, fontSize: "0.95rem" }}>
            Free signup · No card required · See on-chain data behind the philosophy
          </Typography>
        </Container>
      </Box>

      {/* Spirit / motivation */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            fontWeight: "bold",
            fontSize: { xs: "1.75rem", md: "2.25rem" },
            mb: 2,
            textAlign: "center",
          }}
        >
          The spirit behind the design
        </Typography>
        <Typography
          sx={{
            color: colors.grey[300],
            fontSize: "1.1rem",
            lineHeight: 1.8,
            maxWidth: 800,
            mx: "auto",
            textAlign: "center",
            mb: 5,
          }}
        >
          Bitcoin was not created to make day-trading easier. It was created because centrally controlled money can be
          debased, censored, and confiscated, sometimes slowly through inflation, sometimes suddenly when a third party
          decides you are no longer a customer.
        </Typography>
        <Grid container spacing={3}>
          {[
            {
              icon: <AccountBalanceWalletIcon sx={{ fontSize: 40, color: colors.greenAccent[500] }} />,
              title: "Debasement",
              text: "When money supply expands faster than productive output, each unit buys less. Savers and wage earners pay the bill. Bitcoin's issuance schedule is public and hard to change unilaterally.",
            },
            {
              icon: <GavelIcon sx={{ fontSize: 40, color: colors.greenAccent[500] }} />,
              title: "Arbitrary control",
              text: "Banks and processors can freeze accounts, block donations, or reverse payments. That power may be used for compliance, but it is still power over your economic life, often without a trial.",
            },
            {
              icon: <LockOpenIcon sx={{ fontSize: 40, color: colors.greenAccent[500] }} />,
              title: "Permission",
              text: "Bitcoin aims to let any two willing parties transact online without asking a gatekeeper first. Participation is voluntary and global, closer to cash than to a membership programme.",
            },
          ].map((item) => (
            <Grid item xs={12} md={4} key={item.title}>
              <Card sx={sectionCardSx}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>{item.icon}</Box>
                  <Typography variant="h6" sx={{ color: colors.greenAccent[400], mb: 1.5, fontWeight: "bold" }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: colors.grey[300], lineHeight: 1.7 }}>{item.text}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Mid-page email capture CTA */}
        <Box
          sx={{
            mt: 6,
            p: { xs: 3, md: 4 },
            textAlign: "center",
            borderRadius: 2,
            background: `linear-gradient(135deg, ${colors.greenAccent[900]}55 0%, ${colors.primary[800]} 100%)`,
            border: `1px solid ${colors.greenAccent[800]}`,
          }}
        >
          <Typography variant="h5" sx={{ color: colors.grey[100], fontWeight: "bold", mb: 1.5 }}>
            You understand why Bitcoin. Now see where the market is.
          </Typography>
          <Typography sx={{ color: colors.grey[300], mb: 3, lineHeight: 1.7, maxWidth: 560, mx: "auto" }}>
            Cryptological turns abstract ideas into observable history, risk cycles, on-chain behaviour, and market
            structure. Start with free charts; no payment details needed.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              component={TrackedSignupLink}
              to={FREE_SIGNUP}
              location="whitepaper-mid"
              variant="contained"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                fontWeight: "bold",
                px: 4,
                "&:hover": { backgroundColor: colors.greenAccent[400] },
              }}
            >
              Create free account
            </Button>
            <Button
              component={Link}
              to="/chart-gallery"
              variant="outlined"
              sx={{
                color: colors.grey[100],
                borderColor: colors.grey[500],
                "&:hover": { borderColor: colors.grey[300] },
              }}
            >
              Browse chart gallery
            </Button>
          </Stack>
        </Box>
      </Container>

      <Divider sx={{ width: "80%", borderColor: colors.primary[600] }} />

      {/* Traditional vs Bitcoin */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            fontWeight: "bold",
            fontSize: { xs: "1.75rem", md: "2.25rem" },
            mb: 3,
          }}
        >
          Traditional finance vs the Bitcoin model
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ ...sectionCardSx, backgroundColor: colors.primary[700] }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: colors.grey[200], mb: 2 }}>
                  What you are used to
                </Typography>
                <Box component="ul" sx={{ color: colors.grey[400], pl: 2.5, m: 0, lineHeight: 1.9 }}>
                  <li>Balances live on a company's ledger</li>
                  <li>Rules change with regulation and policy</li>
                  <li>Supply can expand to meet political needs</li>
                  <li>Access can be revoked</li>
                  <li>You trust auditors you never meet</li>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ ...sectionCardSx, borderColor: colors.greenAccent[700] }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: colors.greenAccent[400], mb: 2 }}>
                  What the whitepaper proposes
                </Typography>
                <Box component="ul" sx={{ color: colors.grey[300], pl: 2.5, m: 0, lineHeight: 1.9 }}>
                  <li>Ownership proved by cryptography</li>
                  <li>History shared across thousands of nodes</li>
                  <li>Issuance algorithm baked into consensus rules</li>
                  <li>Transactions that clear without account approval</li>
                  <li>Verify rather than trust</li>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Whitepaper walkthrough */}
      <Box sx={{ width: "100%", py: { xs: 6, md: 8 }, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="md">
          <Typography
            variant="h2"
            sx={{
              color: colors.grey[100],
              fontWeight: "bold",
              fontSize: { xs: "1.75rem", md: "2.25rem" },
              mb: 1,
              textAlign: "center",
            }}
          >
            Section-by-section walkthrough
          </Typography>
          <Typography
            sx={{
              color: colors.grey[400],
              textAlign: "center",
              mb: 4,
              maxWidth: 640,
              mx: "auto",
            }}
          >
            Satoshi's paper is technical. Below is a lay translation of each major part, what problem it solves and why
            it matters for ordinary people.
          </Typography>
          {WHITEPAPER_SECTIONS.map((section) => (
            <Accordion
              key={section.id}
              disableGutters
              elevation={0}
              sx={{
                backgroundColor: colors.primary[900],
                color: colors.grey[100],
                mb: 1.5,
                borderRadius: "8px !important",
                border: `1px solid ${colors.primary[600]}`,
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.greenAccent[500] }} />}>
                <Box>
                  <Typography sx={{ fontWeight: "bold", color: colors.grey[100] }}>{section.title}</Typography>
                  <Typography variant="body2" sx={{ color: colors.grey[400], mt: 0.5 }}>
                    {section.summary}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {section.body.map((paragraph) => (
                  <Typography key={paragraph.slice(0, 40)} sx={{ color: colors.grey[300], lineHeight: 1.8, mb: 2 }}>
                    {paragraph}
                  </Typography>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Container>
      </Box>

      {/* How it works simply */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            fontWeight: "bold",
            fontSize: { xs: "1.75rem", md: "2.25rem" },
            mb: 4,
            textAlign: "center",
          }}
        >
          How it works, in one minute
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {[
            {
              step: "1",
              title: "You hold a secret key",
              text: "Like a password that proves you control certain coins. Lose it without a backup and no help desk can recover it, that is the trade-off for self-custody.",
            },
            {
              step: "2",
              title: "You broadcast a signed payment",
              text: "Your wallet publishes the transaction to the network. Nodes check the maths and reject invalid spends.",
            },
            {
              step: "3",
              title: "Miners anchor it in a block",
              text: "Competition to publish the next block orders transactions into history. The chain with the most work wins.",
            },
            {
              step: "4",
              title: "Everyone updates their copy",
              text: "Thousands of computers keep the same timeline. You can run one yourself, no invitation needed.",
            },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.step}>
              <Card sx={sectionCardSx}>
                <CardContent>
                  <Typography
                    sx={{
                      color: colors.greenAccent[500],
                      fontWeight: "bold",
                      fontSize: "2rem",
                      mb: 1,
                    }}
                  >
                    {item.step}
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.grey[100], mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ color: colors.grey[400], lineHeight: 1.7, fontSize: "0.95rem" }}>
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Other networks */}
      <Box sx={{ width: "100%", py: { xs: 6, md: 8 }, backgroundColor: colors.primary[800] }}>
        <Container maxWidth="md">
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
            <HubIcon sx={{ color: colors.greenAccent[500] }} />
            <Typography
              variant="h2"
              sx={{
                color: colors.grey[100],
                fontWeight: "bold",
                fontSize: { xs: "1.75rem", md: "2.25rem" },
              }}
            >
              What about other tokens and networks?
            </Typography>
          </Stack>
          <Typography sx={{ color: colors.grey[400], textAlign: "center", mb: 4, lineHeight: 1.7 }}>
            Once you understand Bitcoin's design goal, minimise trusted third parties, you can evaluate other projects
            with the same lens instead of treating every ticker as interchangeable.
          </Typography>
          {OTHER_NETWORKS.map((block) => (
            <Card key={block.title} sx={{ ...sectionCardSx, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: colors.greenAccent[400], mb: 1 }}>
                  {block.title}
                </Typography>
                <Typography sx={{ color: colors.grey[300], lineHeight: 1.8 }}>{block.text}</Typography>
              </CardContent>
            </Card>
          ))}
        </Container>
      </Box>

      {/* Honest limits */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography
          variant="h2"
          sx={{
            color: colors.grey[100],
            fontWeight: "bold",
            fontSize: { xs: "1.75rem", md: "2.25rem" },
            mb: 2,
          }}
        >
          Honest limits, what Bitcoin does not fix
        </Typography>
        <Typography sx={{ color: colors.grey[300], lineHeight: 1.8, mb: 2 }}>
          No system is utopia. Bitcoin does not make you anonymous by default, does not reverse scams for you, and does
          not guarantee price appreciation. Energy use for proof-of-work is a real societal debate. Volatility is still
          high because the asset is young and thinly understood by mainstream finance.
        </Typography>
        <Typography sx={{ color: colors.grey[300], lineHeight: 1.8 }}>
          The whitepaper's promise is narrower and, for many people, more important: a form of money whose rules are
          visible, whose history is auditable, and whose use is harder to switch off for political convenience alone.
        </Typography>
      </Container>

      {/* CTA */}
      <Box
        sx={{
          width: "100%",
          py: { xs: 8, md: 10 },
          textAlign: "center",
          background: `linear-gradient(135deg, ${colors.greenAccent[900]} 0%, ${colors.primary[800]} 100%)`,
        }}
      >
        <Container maxWidth="sm">
          <LinkIcon sx={{ fontSize: 48, color: colors.greenAccent[400], mb: 2 }} />
          <Typography variant="h4" sx={{ color: colors.grey[100], fontWeight: "bold", mb: 2 }}>
            See the data behind the story
          </Typography>
          <Typography sx={{ color: colors.grey[300], mb: 4, lineHeight: 1.7 }}>
            You understand the philosophy. See the on-chain data that reflects it, risk bands, cycle positioning,
            and market heat. Free account, no card required.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              component={TrackedSignupLink}
              to={FREE_SIGNUP}
              location="whitepaper-bottom"
              variant="contained"
              size="large"
              sx={{
                backgroundColor: colors.greenAccent[500],
                color: colors.grey[900],
                fontWeight: "bold",
                px: 4,
                "&:hover": { backgroundColor: colors.greenAccent[400] },
              }}
            >
              Create free account
            </Button>
            <Button
              component={Link}
              to="/"
              variant="outlined"
              size="large"
              sx={{
                color: colors.grey[100],
                borderColor: colors.grey[500],
                "&:hover": { borderColor: colors.grey[300] },
              }}
            >
              Back to home
            </Button>
          </Stack>
        </Container>
      </Box>

      <SeoPublicFooter />
    </Box>
  );
};

export default BitcoinWhitepaper;
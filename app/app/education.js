import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import React, { useState, useMemo, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const EDUCATION_DATA = {
    A: [
        {
            title: "Algorithmic Trading",
            description:
                "An algorithm is a set of instructions to be followed in a step-by-step manner by a computer. Algorithmic trading is the use of algorithms to automatically open and close trades according to predefined parameters. For instance, an algorithm can be programmed to observe the overbought and oversold conditions of a given market and to automatically open and close positions when certain criteria are met.",
        },
        {
            title: "Arbitrage",
            description:
                "Arbitrage is when traders take advantage of price inefficiencies between markets. If, for instance, you become aware that a certain asset is selling for a higher price on Market A than you are able to purchase it for on Market B, then buying it at the cheaper price and selling it on the more expensive market would be an example of arbitrage. In practice, arbitrage becomes harder to take advantage of the more interconnected markets become.",
        },
        {
            title: "Asian Session",
            description:
                "The global forex market is open 24/5 and is divided into three trading sessions in each day. These sessions refer to different regions of the globe as they open and close for business throughout every 24 hour period. The Asian session is the first to open after the weekend, it runs between 11 pm and 8 am GMT and includes countries such as New Zealand, Australia, Japan, China and Russia.",
        },
        {
            title: "Ask Price",
            description:
                "When trading, you will be presented with two prices for any asset that you're interested in, the bid price and the ask price. The ask price (also known as the offer price) is the lowest price at which sellers are willing to sell the asset in question. In short, if you are buying you will receive the ask price.",
        },
        {
            title: "ATR (Average True Range)",
            description:
                "ATR is a technical indicator that measures market volatility by calculating the average range between high and low prices over a specified period. It's commonly used to set stop-loss levels and determine position sizes.",
        },
        {
            title: "Altcoin",
            description:
                "An altcoin is any cryptocurrency other than Bitcoin. The term is a combination of 'alternative' and 'coin' and includes popular cryptocurrencies like Ethereum, Litecoin, Ripple, and thousands of others.",
        },
    ],
    B: [
        {
            title: "Balance",
            description:
                "Your balance is the amount of money you have available in your trading account.",
        },
        {
            title: "Base Currency",
            description:
                "Currencies are quoted in pairs. The base currency is the first currency in any currency pair. For example, in the EURUSD pair the base currency is the Euro. The exchange rate tells you how much of the second currency in the pair you need in order to buy a single unit of the first currency. A EURUSD exchange rate of 1.14 means that you need to spend 1 dollar and 14 cents in order to purchase 1 Euro.",
        },
        {
            title: "Bear Market",
            description:
                "A bear market is a market that has consistently fallen in value. Sentiment in a bear market is negative, traders choose to sell the assets that they are holding, reasoning that further drops in price are imminent. Bear markets have a self-perpetuating nature as widespread selling inspires further selling. This occurs until the market in question becomes oversold and thus an attractive investment opportunity again.",
        },
        {
            title: "Bid Price",
            description:
                "As a trader you will be quoted two prices for any security that you are trading. The bid price is the highest price that buyers are willing to pay. The ask price is the lowest price that sellers are willing to receive in order to part with that same security. When selling you will receive the bid price.",
        },
        {
            title: "Bollinger Bands",
            description:
                "Bollinger bands is a type of indicator used in technical analysis. It was developed by John Bollinger and is classified as a volatility indicator. Essentially, Bollinger bands compare current highs and lows to historical price action. Bollinger bands are calculated using a moving average line and two bands, each plotted one standard deviation above and one standard deviation below this moving average line.",
        },
        {
            title: "Breakout",
            description:
                "A breakout occurs when a security's price suddenly breaks into new territory. The term is most commonly used to describe a positive move, where price action pushes through a known area of resistance, allowing the security to trade higher.",
        },
        {
            title: "Broker",
            description:
                "In finance, brokers bring buyers and sellers together, allowing them to trade between themselves, effectively making a market. Brokers receive commissions for each trade they broker or alternatively a mark-up on the bid/ask spread offered to clients.",
        },
        {
            title: "Bull Market",
            description:
                "Bull markets exist when prices consistently rise for a sustained period of time. Sentiment during bull markets is overwhelmingly positive, with traders purchasing assets in the hope that they will continue rising in value. Bull markets are often self-perpetuating and can be extremely vulnerable to the formation of bubbles as more traders flock to the same securities.",
        },
        {
            title: "Bitcoin",
            description:
                "Bitcoin is the first and most well-known cryptocurrency, created by the pseudonymous Satoshi Nakamoto in 2009. It operates on a decentralized blockchain network and is often referred to as digital gold.",
        },
        {
            title: "Blue Chip Stocks",
            description:
                "Blue chip stocks are shares of large, well-established, and financially stable companies with a history of reliable performance. Examples include companies in the Dow Jones Industrial Average like Apple, Microsoft, and Coca-Cola.",
        },
    ],
    C: [
        {
            title: "Candlestick Chart",
            description:
                "A candlestick chart is a type of price chart used in technical analysis that displays the high, low, open, and closing prices of a security for a specific period. Each candlestick represents one time period and provides visual information about price movement and market sentiment.",
        },
        {
            title: "Carry Trade",
            description:
                "A carry trade is a trading strategy that involves borrowing at a low interest rate and investing in an asset that provides a higher rate of return. In forex, this typically involves buying a currency with a high interest rate while selling a currency with a low interest rate.",
        },
        {
            title: "Central Bank",
            description:
                "A central bank is a financial institution that manages a country's currency, money supply, and interest rates. Central banks also oversee the commercial banking system of their respective countries. Examples include the Federal Reserve (US), European Central Bank (EU), and Bank of Japan (Japan).",
        },
        {
            title: "CFD (Contract for Difference)",
            description:
                "A CFD is a financial derivative that allows traders to speculate on the rising or falling prices of fast-moving global financial markets without actually owning the underlying asset. CFDs are available for forex, stocks, indices, commodities, and cryptocurrencies.",
        },
        {
            title: "Cryptocurrency",
            description:
                "A cryptocurrency is a digital or virtual currency that uses cryptography for security. Cryptocurrencies operate independently of a central bank and use blockchain technology to maintain a secure and decentralized ledger of transactions.",
        },
        {
            title: "Cross Currency Pair",
            description:
                "A cross currency pair is a currency pair that does not include the US Dollar. Examples include EUR/GBP, GBP/JPY, and AUD/CAD. These pairs often have wider spreads than major pairs.",
        },
        {
            title: "Commodity",
            description:
                "A commodity is a raw material or primary agricultural product that can be bought and sold. In trading, commodities include precious metals (gold, silver), energy products (oil, gas), and agricultural products (wheat, corn).",
        },
    ],
    D: [
        {
            title: "Day Trading",
            description:
                "Day trading is a trading strategy where positions are opened and closed within the same trading day. Day traders aim to profit from short-term price movements and typically do not hold positions overnight to avoid overnight risk.",
        },
        {
            title: "Drawdown",
            description:
                "Drawdown refers to the peak-to-trough decline during a specific period for an investment, trading account, or fund. It is usually quoted as the percentage between the peak and the trough. Drawdown is an important risk metric for traders and investors.",
        },
        {
            title: "Doji",
            description:
                "A doji is a type of candlestick pattern where the opening and closing prices are virtually equal, creating a cross-like appearance. Doji patterns often signal market indecision and potential trend reversals.",
        },
        {
            title: "Dividend",
            description:
                "A dividend is a payment made by a corporation to its shareholders, usually from profits. Dividends can be paid in cash or additional shares and are typically distributed quarterly.",
        },
        {
            title: "DeFi (Decentralized Finance)",
            description:
                "DeFi refers to a blockchain-based form of finance that does not rely on central financial intermediaries. It uses smart contracts on blockchains to provide traditional financial services.",
        },
        {
            title: "Dollar Cost Averaging",
            description:
                "Dollar cost averaging is an investment strategy where a fixed amount of money is invested in a particular asset at regular intervals, regardless of the asset's price. This strategy helps reduce the impact of volatility.",
        },
    ],
    E: [
        {
            title: "Economic Calendar",
            description:
                "An economic calendar is a schedule of economic events, announcements, and data releases that can impact financial markets. Traders use economic calendars to stay informed about upcoming events that may affect their trading decisions.",
        },
        {
            title: "Elliott Wave Theory",
            description:
                "Elliott Wave Theory is a method of technical analysis that looks for recurrent long-term price patterns related to persistent changes in investor sentiment and psychology. The theory identifies impulse waves that establish the trend and corrective waves that move against the trend.",
        },
        {
            title: "Equity",
            description:
                "In trading, equity refers to the current value of a trading account, calculated as the balance plus or minus any unrealized profit or loss from open positions. It represents the actual worth of the account at any given moment.",
        },
        {
            title: "EUR/USD",
            description:
                "EUR/USD is the most traded currency pair in the forex market, representing the Euro against the US Dollar. It's often called the 'fiber' by traders and typically has the tightest spreads.",
        },
        {
            title: "ETF (Exchange-Traded Fund)",
            description:
                "An ETF is a type of investment fund that trades on stock exchanges like individual stocks. ETFs typically track an index, commodity, bonds, or a basket of assets and offer diversification at a low cost.",
        },
        {
            title: "Earnings Per Share (EPS)",
            description:
                "EPS is a company's profit divided by the outstanding shares of its common stock. It's a key metric used to determine a company's profitability and is often used in stock valuation.",
        },
    ],
    F: [
        {
            title: "Fibonacci Retracement",
            description:
                "Fibonacci retracement is a technical analysis tool that uses horizontal lines to indicate areas of support or resistance at the key Fibonacci levels before the price continues in the original direction. These levels are derived from the Fibonacci sequence: 23.6%, 38.2%, 50%, 61.8%, and 78.6%.",
        },
        {
            title: "Fundamental Analysis",
            description:
                "Fundamental analysis is a method of evaluating securities by attempting to measure their intrinsic value. In forex, this involves analyzing economic indicators, political events, and other factors that may affect currency values.",
        },
        {
            title: "Forex (Foreign Exchange)",
            description:
                "Forex, also known as FX or foreign exchange, is the global marketplace for trading national currencies against one another. It is the largest and most liquid financial market in the world, with a daily trading volume exceeding $6 trillion.",
        },
        {
            title: "FOMO (Fear of Missing Out)",
            description:
                "FOMO is an emotional response that can lead to impulsive trading decisions. It occurs when traders fear missing out on potential profits and make rushed investment decisions without proper analysis.",
        },
        {
            title: "Futures Contract",
            description:
                "A futures contract is a legal agreement to buy or sell a particular commodity or financial instrument at a predetermined price at a specified time in the future. Futures are standardized and traded on exchanges.",
        },
        {
            title: "Free Float",
            description:
                "Free float refers to the shares of a publicly traded company that are available for trading by the general public. It excludes shares held by company insiders, governments, or other controlling interests.",
        },
    ],
    G: [
        {
            title: "Gap",
            description:
                "A gap occurs when a security's price jumps from one level to another without any trading occurring in between. Gaps can occur due to news events, earnings announcements, or other factors that cause significant changes in market sentiment.",
        },
        {
            title: "Going Long",
            description:
                "Going long means buying a security with the expectation that its price will rise. When you go long on a currency pair, you are buying the base currency and selling the quote currency.",
        },
        {
            title: "Going Short",
            description:
                "Going short means selling a security with the expectation that its price will fall. In forex, when you go short on a currency pair, you are selling the base currency and buying the quote currency.",
        },
        {
            title: "GDP (Gross Domestic Product)",
            description:
                "GDP is the total monetary value of all finished goods and services produced within a country's borders in a specific time period. It's a key economic indicator that significantly impacts currency values.",
        },
        {
            title: "Gold Standard",
            description:
                "The gold standard is a monetary system in which a currency's value is directly linked to gold. Although no longer used by any government, gold remains an important safe-haven asset in times of economic uncertainty.",
        },
        {
            title: "Grid Trading",
            description:
                "Grid trading is a strategy that involves placing buy and sell orders at regular intervals above and below a set price. This creates a grid of orders that aim to profit from normal price volatility.",
        },
    ],
    H: [
        {
            title: "Hedge",
            description:
                "A hedge is an investment position intended to offset potential losses or gains that may be incurred by a companion investment. In forex trading, hedging involves opening positions to reduce the risk of adverse price movements.",
        },
        {
            title: "High-Frequency Trading (HFT)",
            description:
                "High-frequency trading is a type of algorithmic trading characterized by high speeds, high turnover rates, and high order-to-trade ratios. HFT uses powerful computers to transact a large number of orders at very fast speeds.",
        },
        {
            title: "Hammer",
            description:
                "A hammer is a bullish reversal candlestick pattern that typically occurs at the bottom of a downtrend. It has a small body with a long lower wick, indicating that sellers drove prices down but buyers regained control.",
        },
        {
            title: "Hard Fork",
            description:
                "In cryptocurrency, a hard fork is a radical change to a blockchain protocol that makes previously invalid blocks/transactions valid or vice-versa. It requires all nodes to upgrade to the latest version of the protocol software.",
        },
        {
            title: "HODL",
            description:
                "HODL is a cryptocurrency term that originated from a misspelled 'hold.' It refers to a buy-and-hold strategy where investors hold onto their cryptocurrency for the long term, regardless of market volatility.",
        },
        {
            title: "Hawkish",
            description:
                "Hawkish refers to a monetary policy stance that favors higher interest rates to combat inflation. A hawkish central bank is more likely to raise interest rates, which typically strengthens the currency.",
        },
    ],
    I: [
        {
            title: "Inflation",
            description:
                "Inflation is the rate at which the general level of prices for goods and services is rising, and subsequently, purchasing power is falling. Central banks attempt to limit inflation and avoid deflation to keep the economy running smoothly.",
        },
        {
            title: "Interest Rate",
            description:
                "An interest rate is the amount charged by a lender to a borrower for the use of assets, expressed as a percentage of the principal. Interest rates significantly impact currency values and are closely watched by forex traders.",
        },
        {
            title: "IPO (Initial Public Offering)",
            description:
                "An IPO is the first sale of a company's shares to the public. It allows companies to raise capital from public investors and provides an exit strategy for early investors and founders.",
        },
        {
            title: "Index",
            description:
                "A stock market index is a measurement of the value of a section of the stock market. Popular indices include the S&P 500, Dow Jones, NASDAQ, and FTSE 100. Indices are used as benchmarks for market performance.",
        },
        {
            title: "Ichimoku Cloud",
            description:
                "The Ichimoku Cloud is a comprehensive technical analysis indicator that provides information about support and resistance levels, trend direction, and momentum. It consists of five lines that create a 'cloud' on the chart.",
        },
        {
            title: "Insider Trading",
            description:
                "Insider trading refers to the buying or selling of securities by individuals who have access to non-public, material information about the company. It's illegal in most jurisdictions when done for personal profit.",
        },
    ],
    J: [
        {
            title: "Japanese Yen (JPY)",
            description:
                "The Japanese Yen is the official currency of Japan and the third most traded currency in the forex market. Yen pairs are quoted to two decimal places instead of four, making a pip worth 0.01.",
        },
        {
            title: "Japanese Candlesticks",
            description:
                "Japanese candlesticks are a type of price chart that originated in Japan in the 18th century. They display open, high, low, and close prices for specific time periods and are widely used in technical analysis.",
        },
        {
            title: "Jobless Claims",
            description:
                "Jobless claims are a weekly economic indicator that measures the number of people filing for unemployment benefits. High jobless claims can indicate economic weakness and may negatively impact currency values.",
        },
        {
            title: "Joint Venture",
            description:
                "A joint venture is a business arrangement where two or more parties agree to pool their resources for a specific task or business activity. In trading, this might involve collaborative investment strategies.",
        },
    ],
    K: [
        {
            title: "Key Level",
            description:
                "A key level is a significant price point that acts as strong support or resistance. These levels are often psychological round numbers, previous highs/lows, or areas where significant volume has traded.",
        },
        {
            title: "Keltner Channels",
            description:
                "Keltner Channels are volatility-based technical indicators that consist of three lines: a middle line (exponential moving average) and upper and lower bands based on the Average True Range (ATR).",
        },
        {
            title: "KYC (Know Your Customer)",
            description:
                "KYC is a process used by financial institutions to verify the identity of their clients. It includes collecting personal information and documentation to comply with anti-money laundering regulations.",
        },
        {
            title: "Kiwi",
            description:
                "Kiwi is the nickname for the New Zealand Dollar (NZD), particularly in the NZD/USD currency pair. The nickname comes from New Zealand's national bird and symbol.",
        },
    ],
    L: [
        {
            title: "Leverage",
            description:
                "Leverage is the use of borrowed capital to increase the potential return of an investment. In forex trading, leverage allows traders to control larger positions with a smaller amount of capital. For example, 1:100 leverage means you can control $100,000 with just $1,000.",
        },
        {
            title: "Liquidity",
            description:
                "Liquidity refers to how easily an asset can be bought or sold in the market without affecting its price. High liquidity means there are many buyers and sellers, making it easy to execute trades quickly at stable prices.",
        },
        {
            title: "Long Position",
            description:
                "A long position is a trade where the trader buys a security expecting its price to rise. In forex, going long on a currency pair means buying the base currency and selling the quote currency.",
        },
        {
            title: "London Session",
            description:
                "The London session is one of the three major forex trading sessions, running from 8:00 AM to 5:00 PM GMT. It's the most active session, accounting for about 43% of all forex transactions.",
        },
        {
            title: "Limit Order",
            description:
                "A limit order is an order to buy or sell a security at a specific price or better. A buy limit order will only execute at the limit price or lower, while a sell limit order will only execute at the limit price or higher.",
        },
        {
            title: "Lot Size",
            description:
                "A lot is a standard trading unit in forex. A standard lot is 100,000 units of the base currency, a mini lot is 10,000 units, and a micro lot is 1,000 units.",
        },
    ],
    M: [
        {
            title: "Margin",
            description:
                "Margin is the deposit required to open a leveraged trading position. It represents a fraction of the full value of the position. Margin allows traders to access larger positions than their account balance would normally allow.",
        },
        {
            title: "Margin Call",
            description:
                "A margin call occurs when the value of an investor's margin account falls below the broker's required amount. It is a demand by the broker for the investor to deposit additional money or securities to bring the account back to the minimum value.",
        },
        {
            title: "Moving Average",
            description:
                "A moving average is a technical analysis indicator that smooths out price data by creating a constantly updated average price. It helps identify trends by filtering out the noise from random price fluctuations.",
        },
        {
            title: "MACD (Moving Average Convergence Divergence)",
            description:
                "MACD is a trend-following momentum indicator that shows the relationship between two moving averages of a security's price. It consists of the MACD line, signal line, and histogram.",
        },
        {
            title: "Market Maker",
            description:
                "A market maker is a firm or individual that actively quotes two-sided markets in a particular security, providing bids and offers along with market size. They profit from the bid-ask spread.",
        },
        {
            title: "Market Cap",
            description:
                "Market capitalization is the total value of a company's shares in the stock market. It's calculated by multiplying the current stock price by the total number of outstanding shares.",
        },
    ],
    N: [
        {
            title: "News Trading",
            description:
                "News trading is a strategy that involves making trading decisions based on news announcements and economic data releases. Traders attempt to capitalize on the volatility and price movements that often follow significant news events.",
        },
        {
            title: "Non-Farm Payrolls (NFP)",
            description:
                "Non-Farm Payrolls is a key economic indicator for the United States that represents the total number of paid workers in the US excluding farm employees, government employees, private household employees, and employees of nonprofit organizations.",
        },
        {
            title: "NASDAQ",
            description:
                "NASDAQ is an American stock exchange and the second-largest stock exchange in the world by market capitalization. It's known for listing many technology companies including Apple, Microsoft, and Amazon.",
        },
        {
            title: "NFT (Non-Fungible Token)",
            description:
                "An NFT is a unique digital asset that represents ownership of a specific item or piece of content on a blockchain. Unlike cryptocurrencies, NFTs are not interchangeable and each has unique properties.",
        },
        {
            title: "Negative Balance Protection",
            description:
                "Negative balance protection is a feature offered by some brokers that prevents traders from losing more money than they have in their account, protecting them from owing money to the broker.",
        },
        {
            title: "New York Session",
            description:
                "The New York session is one of the three major forex trading sessions, running from 1:00 PM to 10:00 PM GMT. It overlaps with the London session, creating the most active trading period.",
        },
    ],
    O: [
        {
            title: "Open Position",
            description:
                "An open position is a trade that has been entered but not yet closed with an opposing trade. Open positions can be either long (buy) or short (sell) and remain open until they are closed by the trader or automatically closed by the broker.",
        },
        {
            title: "Order",
            description:
                "An order is an instruction to buy or sell a financial instrument. There are various types of orders including market orders, limit orders, stop orders, and more, each with different execution conditions.",
        },
        {
            title: "Options",
            description:
                "Options are financial derivatives that give the holder the right, but not the obligation, to buy or sell an underlying asset at a specific price within a certain time period.",
        },
        {
            title: "Overbought",
            description:
                "Overbought is a condition where a security's price has risen to levels that are not supported by fundamentals or technical indicators, suggesting a potential price decline. RSI above 70 often indicates overbought conditions.",
        },
        {
            title: "Oversold",
            description:
                "Oversold is a condition where a security's price has fallen to levels that are below its intrinsic value, suggesting a potential price increase. RSI below 30 often indicates oversold conditions.",
        },
        {
            title: "OCO Order (One-Cancels-Other)",
            description:
                "An OCO order is a pair of orders where the execution of one order automatically cancels the other. This is commonly used to set both profit targets and stop losses simultaneously.",
        },
    ],
    P: [
        {
            title: "Pip",
            description:
                "A pip (percentage in point) is the smallest price move in a currency pair. For most currency pairs, a pip is the fourth decimal place (0.0001), except for pairs involving the Japanese Yen where a pip is the second decimal place (0.01).",
        },
        {
            title: "Position Size",
            description:
                "Position size refers to the number of units of a security held by an investor or trader. Proper position sizing is crucial for risk management and determines how much of your capital is at risk in each trade.",
        },
        {
            title: "Price Action",
            description:
                "Price action is the movement of a security's price plotted over time. Price action trading involves making trading decisions based on the recent and historical price movements rather than relying solely on technical indicators.",
        },
        {
            title: "P/E Ratio (Price-to-Earnings)",
            description:
                "The P/E ratio is a valuation metric that compares a company's current share price to its earnings per share. It indicates how much investors are willing to pay per dollar of earnings.",
        },
        {
            title: "Portfolio",
            description:
                "A portfolio is a collection of financial investments like stocks, bonds, commodities, cash, and cash equivalents. Diversification across different assets is key to portfolio management.",
        },
        {
            title: "Pivot Point",
            description:
                "A pivot point is a technical analysis indicator used to determine the overall trend of the market over different time frames. It's calculated using the previous day's high, low, and closing prices.",
        },
    ],
    Q: [
        {
            title: "Quote Currency",
            description:
                "The quote currency is the second currency in a currency pair. In EUR/USD, USD is the quote currency. The exchange rate shows how much of the quote currency is needed to buy one unit of the base currency.",
        },
        {
            title: "Quantitative Easing (QE)",
            description:
                "QE is an unconventional monetary policy tool where central banks purchase government securities or other securities from the market to increase the money supply and encourage lending and investment.",
        },
        {
            title: "Quarterly Earnings",
            description:
                "Quarterly earnings are financial reports that public companies must file every three months, showing their financial performance. These reports significantly impact stock prices.",
        },
        {
            title: "Quick Ratio",
            description:
                "The quick ratio is a financial metric that measures a company's ability to meet short-term obligations with its most liquid assets, excluding inventory from current assets.",
        },
    ],
    R: [
        {
            title: "Resistance",
            description:
                "Resistance is a price level where a security tends to stop rising and may reverse direction. It represents a ceiling where selling pressure overcomes buying pressure, preventing the price from moving higher.",
        },
        {
            title: "Risk Management",
            description:
                "Risk management is the process of identifying, analyzing, and mitigating potential losses in trading. It includes strategies like position sizing, stop losses, diversification, and proper leverage usage to protect capital.",
        },
        {
            title: "RSI (Relative Strength Index)",
            description:
                "RSI is a momentum oscillator that measures the speed and magnitude of price changes. It ranges from 0 to 100 and is typically used to identify overbought (above 70) and oversold (below 30) conditions.",
        },
        {
            title: "Rollover",
            description:
                "Rollover is the process of extending the settlement date of an open position. In forex, positions held overnight are automatically rolled over, and traders either pay or receive interest based on the interest rate differential.",
        },
        {
            title: "Risk-Reward Ratio",
            description:
                "The risk-reward ratio compares the potential profit of a trade to its potential loss. A 1:2 risk-reward ratio means you're risking $1 to potentially make $2.",
        },
        {
            title: "Resistance Level",
            description:
                "A resistance level is a price point where an asset tends to stop rising due to increased selling pressure. Multiple touches of this level without breaking through confirm its significance.",
        },
    ],
    S: [
        {
            title: "Scalping",
            description:
                "Scalping is a trading strategy that involves making numerous trades over short time frames to capture small price movements. Scalpers typically hold positions for seconds to minutes and aim for small but frequent profits.",
        },
        {
            title: "Slippage",
            description:
                "Slippage is the difference between the expected price of a trade and the actual price at which the trade is executed. It often occurs during periods of high volatility or when there is insufficient liquidity in the market.",
        },
        {
            title: "Spread",
            description:
                "The spread is the difference between the bid price (selling price) and ask price (buying price) of a currency pair. It represents the cost of trading and is how brokers typically make money from trades.",
        },
        {
            title: "Stop Loss",
            description:
                "A stop loss is an order placed with a broker to buy or sell a security when it reaches a certain price. It is designed to limit an investor's loss on a position and is a crucial risk management tool.",
        },
        {
            title: "Support",
            description:
                "Support is a price level where a security tends to stop falling and may reverse direction upward. It represents a floor where buying pressure overcomes selling pressure, preventing the price from moving lower.",
        },
        {
            title: "Swap",
            description:
                "A swap in forex trading is the interest rate differential between the two currencies in a pair. When holding a position overnight, traders either pay or receive swap depending on the interest rate differential and their position direction.",
        },
        {
            title: "Stochastic Oscillator",
            description:
                "The Stochastic Oscillator is a momentum indicator that compares a security's closing price to its price range over a specific period. It ranges from 0 to 100 and helps identify overbought and oversold conditions.",
        },
        {
            title: "S&P 500",
            description:
                "The S&P 500 is a stock market index that tracks the performance of 500 large companies listed on stock exchanges in the United States. It's widely regarded as the best gauge of large-cap U.S. equities.",
        },
    ],
    T: [
        {
            title: "Take Profit",
            description:
                "A take profit order is an order placed with a broker to sell a security when it reaches a certain profit target. It allows traders to automatically close profitable positions and lock in gains.",
        },
        {
            title: "Technical Analysis",
            description:
                "Technical analysis is a method of evaluating securities by analyzing statistics generated by market activity, such as past prices and volume. Technical analysts use charts and various indicators to identify patterns and predict future price movements.",
        },
        {
            title: "Trend",
            description:
                "A trend is the general direction in which a security's price is moving. Trends can be upward (bullish), downward (bearish), or sideways (ranging). Identifying trends is fundamental to many trading strategies.",
        },
        {
            title: "Trading Volume",
            description:
                "Trading volume is the number of shares or contracts traded in a security during a given period. High volume often confirms price movements and indicates strong investor interest.",
        },
        {
            title: "Triangle Pattern",
            description:
                "A triangle pattern is a chart pattern characterized by converging trend lines connecting a series of peaks and troughs. It can be ascending, descending, or symmetrical and often indicates a continuation or reversal.",
        },
        {
            title: "Trailing Stop",
            description:
                "A trailing stop is a dynamic stop loss order that adjusts as the price moves in favor of the trade. It locks in profits while allowing for additional gains if the trend continues.",
        },
    ],
    U: [
        {
            title: "Uptrend",
            description:
                "An uptrend is a series of higher highs and higher lows in price action, indicating that buyers are in control and the overall direction is bullish. Uptrends can occur across all timeframes.",
        },
        {
            title: "USD Index (DXY)",
            description:
                "The US Dollar Index measures the value of the US Dollar against a basket of six major currencies: EUR, JPY, GBP, CAD, SEK, and CHF. It's a key indicator of dollar strength.",
        },
        {
            title: "Unemployment Rate",
            description:
                "The unemployment rate is the percentage of the labor force that is jobless and actively seeking employment. It's a key economic indicator that affects currency values and monetary policy decisions.",
        },
        {
            title: "Undervalued",
            description:
                "An asset is considered undervalued when its current market price is below its intrinsic or fair value. Value investors often seek undervalued stocks with strong fundamentals.",
        },
        {
            title: "Unrealized P&L",
            description:
                "Unrealized profit and loss refers to the theoretical gain or loss on open positions that haven't been closed yet. It fluctuates with market movements and becomes realized when the position is closed.",
        },
    ],
    V: [
        {
            title: "Volatility",
            description:
                "Volatility is a measure of the degree of variation in a security's price over time. High volatility means large price swings, while low volatility indicates more stable prices. Volatility presents both opportunities and risks for traders.",
        },
        {
            title: "Volume",
            description:
                "Volume refers to the number of shares or contracts traded in a security during a given period. Volume is an important indicator that can confirm price movements and signal the strength of trends.",
        },
        {
            title: "VIX (Volatility Index)",
            description:
                "The VIX is a real-time market index that represents the market's expectation of 30-day forward-looking volatility. Often called the 'fear gauge,' it tends to rise during market stress.",
        },
        {
            title: "Value Investing",
            description:
                "Value investing is an investment strategy that involves picking stocks that appear to be trading for less than their intrinsic value. Value investors look for undervalued companies with strong fundamentals.",
        },
        {
            title: "VWAP (Volume Weighted Average Price)",
            description:
                "VWAP is a trading benchmark that gives the average price a security has traded at throughout the day, based on both volume and price. It's commonly used by institutional traders.",
        },
    ],
    W: [
        {
            title: "Whipsaw",
            description:
                "A whipsaw is a sharp price movement followed by a sharp reversal. It often occurs in volatile markets and can result in losses for traders who get caught in false breakouts or breakdowns.",
        },
        {
            title: "Williams %R",
            description:
                "Williams %R is a momentum indicator that measures overbought and oversold levels. It ranges from 0 to -100, with readings above -20 considered overbought and below -80 considered oversold.",
        },
        {
            title: "Wedge Pattern",
            description:
                "A wedge pattern is a chart pattern where price action is bounded by two converging trend lines. Rising wedges are typically bearish, while falling wedges are usually bullish.",
        },
        {
            title: "Wick",
            description:
                "A wick (or shadow) is the thin line extending from the body of a candlestick that shows the high and low prices during the trading period. Long wicks can indicate rejection at certain price levels.",
        },
        {
            title: "Wallet",
            description:
                "In cryptocurrency, a wallet is a digital tool that allows users to store, send, and receive digital currencies. Wallets can be hot (connected to the internet) or cold (offline storage).",
        },
    ],
    X: [
        {
            title: "XAU/USD",
            description:
                "XAU/USD represents the price of gold quoted in US Dollars. XAU is the ISO currency code for one troy ounce of gold, and it's one of the most popular precious metal trading instruments.",
        },
        {
            title: "XRP",
            description:
                "XRP is a digital currency created by Ripple Labs. It's designed for fast, low-cost international payments and is used by financial institutions for cross-border transactions.",
        },
        {
            title: "X-axis",
            description:
                "In trading charts, the X-axis represents time, showing the chronological progression of price data from left to right. Different timeframes can be displayed depending on the chart settings.",
        },
    ],
    Y: [
        {
            title: "Yield",
            description:
                "Yield is the income return on an investment, usually expressed as an annual percentage. In bonds, it's the annual interest payment divided by the bond's current price.",
        },
        {
            title: "Year-over-Year (YoY)",
            description:
                "Year-over-year is a comparison method that looks at data from one year against the same period in the previous year. It's commonly used in economic indicators and earnings reports.",
        },
        {
            title: "Yen Carry Trade",
            description:
                "A yen carry trade involves borrowing Japanese yen at low interest rates and investing in higher-yielding currencies or assets. This strategy was popular when Japan maintained near-zero interest rates.",
        },
        {
            title: "Yellow Metal",
            description:
                "Yellow metal is a colloquial term for gold, often used in trading and financial markets. Gold is considered a safe-haven asset and hedge against inflation and currency devaluation.",
        },
    ],
    Z: [
        {
            title: "Zero Interest Rate Policy (ZIRP)",
            description:
                "ZIRP is a monetary policy tool where central banks set interest rates at or near zero percent. This policy is used to stimulate economic growth during periods of recession or deflation.",
        },
        {
            title: "Zone",
            description:
                "In trading, a zone refers to a price area or range where significant support or resistance is expected. Zones are often wider than specific price levels and account for market volatility.",
        },
        {
            title: "Zombie Company",
            description:
                "A zombie company is a business that earns just enough money to continue operating and service debt but is unable to pay off its debt or invest in growth. These companies can impact market performance.",
        },
        {
            title: "Z-Score",
            description:
                "The Z-score is a statistical measurement that describes a value's relationship to the mean of a group of values. In trading, it can be used to identify overbought or oversold conditions.",
        },
    ],
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const Education = () => {
    const router = useRouter()
    const scrollViewRef = useRef(null)

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedLetter, setSelectedLetter] = useState('')

    // Filter data based on search and letter selection
    const filteredData = useMemo(() => {
        let data = { ...EDUCATION_DATA }

        // Filter by selected letter
        if (selectedLetter) {
            data = { [selectedLetter]: data[selectedLetter] }
        }

        // Filter by search term
        if (searchTerm) {
            const result = {}
            Object.entries(data).forEach(([letter, terms]) => {
                const filtered = terms.filter(
                    (term) =>
                        term.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        term.description.toLowerCase().includes(searchTerm.toLowerCase())
                )
                if (filtered.length > 0) {
                    result[letter] = filtered
                }
            })
            return result
        }

        return data
    }, [searchTerm, selectedLetter])

    const totalTerms = Object.values(filteredData).reduce((sum, terms) => sum + terms.length, 0)

    const clearFilters = () => {
        setSearchTerm('')
        setSelectedLetter('')
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                stickyHeaderIndices={[2]}
            >
                {/* Header */}
                <View className="px-6 py-6 bg-white border-b border-gray-200">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">Trading Glossary</Text>
                    <Text className="text-gray-600">
                        Learn essential trading terms and concepts
                    </Text>
                </View>

                {/* Search */}
                <View className="px-6 py-4 bg-white border-b border-gray-200">
                    <View className="relative">
                        <Ionicons
                            name="search"
                            size={18}
                            color="#9ca3af"
                            style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }}
                        />
                        <TextInput
                            placeholder="Search glossary terms..."
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                        />
                        {searchTerm !== '' && (
                            <TouchableOpacity
                                onPress={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: 12, top: 12 }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close-circle" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Alphabet Navigation */}
                <View className="bg-white border-b border-gray-200 py-3">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
                    >
                        {ALPHABET.map((letter) => (
                            <TouchableOpacity
                                key={letter}
                                onPress={() => setSelectedLetter(selectedLetter === letter ? '' : letter)}
                                className={`w-10 h-10 rounded-full items-center justify-center border ${selectedLetter === letter
                                    ? 'bg-orange-500 border-orange-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                                activeOpacity={0.7}
                            >
                                <Text className={`font-semibold ${selectedLetter === letter ? 'text-white' : 'text-gray-700'
                                    }`}>
                                    {letter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Clear Filters */}
                {(searchTerm || selectedLetter) && (
                    <View className="px-6 py-3 bg-gray-100">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600">
                                Showing {totalTerms} term{totalTerms !== 1 ? 's' : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={clearFilters}
                                className="bg-white border border-gray-300 px-4 py-2 rounded-lg"
                                activeOpacity={0.7}
                            >
                                <Text className="text-gray-700 font-medium text-sm">Clear Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Content */}
                <View className="px-6 py-6">
                    {Object.keys(filteredData).length === 0 ? (
                        <View className="bg-white rounded-xl border border-gray-200 p-12 items-center">
                            <Ionicons name="search-outline" size={64} color="#d1d5db" />
                            <Text className="text-lg font-semibold text-gray-900 mt-4 mb-2 text-center">
                                No Terms Found
                            </Text>
                            <Text className="text-gray-600 text-center">
                                {searchTerm
                                    ? `No results for "${searchTerm}"`
                                    : 'No terms available'}
                            </Text>
                        </View>
                    ) : (
                        Object.entries(filteredData).map(([letter, terms]) => (
                            <View key={letter} className="mb-12">
                                {/* Letter Header */}
                                <View className="flex-row items-center mb-6">
                                    <View className="w-14 h-14 bg-orange-500 rounded-full items-center justify-center mr-4">
                                        <Text className="text-2xl font-bold text-white">{letter}</Text>
                                    </View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        Letter {letter}
                                    </Text>
                                </View>

                                {/* Terms */}
                                <View style={{ gap: 16 }}>
                                    {terms.map((term, index) => (
                                        <View
                                            key={`${letter}-${index}`}
                                            className="bg-white rounded-xl border border-gray-200 p-6"
                                        >
                                            <Text className="text-xl font-bold text-gray-900 mb-3">
                                                {term.title}
                                            </Text>
                                            <Text className="text-gray-700 leading-6">
                                                {term.description}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default Education

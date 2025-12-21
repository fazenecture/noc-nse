# NextMove - Market Movement Predictor

A Node.js application for synchronizing National Stock Exchange (NSE) India derivatives data, specifically options chains for various indices and stocks. The application uses IP rotation to bypass NSE's restrictions on server-based IP addresses.

## Description

This project fetches historical options data (F&O CPV - Futures and Options Cumulative Price Volume) from NSE India's API endpoints. It supports both full synchronization (historical data) and daily incremental syncs. The data is processed and stored in a PostgreSQL database for further analysis or consumption.

The application is designed to run as a scheduled task, executing daily to keep the database up-to-date with the latest options data.

## Features

- **Daily Sync**: Automated daily synchronization of options data for configured symbols
- **Full Sync**: One-time bulk synchronization of historical data
- **IP Rotation**: Bypasses NSE's server IP blocking by rotating through residential proxies
- **Error Handling**: Robust error handling with retry mechanisms and Slack notifications
- **Database Integration**: Stores processed and raw data in PostgreSQL
- **Scheduled Execution**: Runs daily via cron jobs or scheduled tasks
- **Configurable Symbols**: Supports multiple NSE indices (NIFTY, BANKNIFTY, etc.)

## Architecture and Logic

### Core Components

1. **Handler (`src/handler.ts`)**: Entry point for the application. Initializes the sync service and handles the execution flow.

2. **Sync Service (`src/service/sync.service.ts`)**: Main orchestration service that manages the sync process:
   - Determines sync type (daily or full)
   - Coordinates data fetching, processing, and storage
   - Handles chunked parallel processing for performance

3. **NSE Service (`src/service/service.ts`)**: Handles NSE API interactions:
   - Fetches expiry dates for symbols
   - Retrieves historical options data for each expiry date
   - Processes raw data into structured format
   - Manages database insertions with chunking

4. **Database Layer (`src/db/db.ts`)**: PostgreSQL integration for data persistence.

5. **Helper Utilities (`src/helper/helper.ts`)**: Data transformation and processing logic.

### Sync Flow

1. **Initialization**: Service initializes with configured symbols (BANKNIFTY, NIFTY, etc.)

2. **Expiry Date Fetching**: For each symbol, fetch available expiry dates from NSE API

3. **Data Fetching**: For each symbol and expiry combination, retrieve historical options data

4. **Data Processing**: Transform raw NSE data into structured format with calculated fields

5. **Database Storage**: Insert processed data and raw data into PostgreSQL tables

6. **Notification**: Send Slack alerts with sync summary

### Data Structure

- **Raw Data**: Direct API responses from NSE
- **Processed Data**: Structured data with additional calculations (e.g., open interest changes, price movements)

## IP Rotation Bypass

NSE India implements strict IP-based restrictions, blocking requests from server/cloud IP addresses to prevent automated scraping. To circumvent this, the application uses a sophisticated IP rotation system:

### How It Works

1. **Proxy Pool**: Maintains a list of residential proxy servers (HTTP/SOCKS4/SOCKS5)

2. **Rotation Strategy**: 
   - **Sequential**: Cycles through proxies in order
   - **Random**: Randomly selects proxies for each request

3. **Usage Limits**: Each proxy is limited to a configurable number of requests (default: 10) before rotation

4. **Error Handling**: Automatically retries failed requests with different proxies

5. **Block Detection**: Detects rate-limited or blocked responses (HTTP 429, 403, 418) and rotates proxies accordingly

6. **Caching**: Caches successful responses to reduce API calls

### Implementation Details

The `IPRotationManager` class (`src/utils/proxy.rotation.ts`) handles all proxy logic:

- Loads proxies from a file or configuration
- Tracks proxy usage and health
- Implements retry mechanisms with exponential backoff
- Logs activity for monitoring

This approach ensures the application appears to originate from residential IP addresses, mimicking legitimate user traffic.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/fazenecture/noc-nse.git
   cd noc-nse
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Set up environment variables (see Environment Variables section)

4. Build the project:
   ```bash
   yarn build
   ```

## Usage

### Local Development

1. Configure environment variables in `.env.local`

2. Run in development mode:
   ```bash
   yarn dev
   ```

3. For manual sync execution:
   ```bash
   yarn start:dev
   ```

### Production Deployment

The application can be deployed on various platforms (e.g., EC2, Docker containers, or cloud VMs).

1. Configure your deployment environment (e.g., AWS EC2, Docker, etc.)

2. Set up cron jobs or task schedulers to run the sync daily:
   ```bash
   # Example cron job for daily execution at 8:30 PM IST
   30 15 * * * /path/to/your/app/yarn start
   ```

3. Ensure environment variables are configured in your deployment environment.

## Environment Variables

Create a `.env` or `.env.local` file with the following variables:

```env
# Database Configuration
DB_HOST=your-postgres-host
DB_USERNAME=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=5432

# Proxy Configuration
PROXY_LIST=proxy1:port,proxy2:port,...
PROXY_FILE=path/to/proxy/file.txt
PROXY_TYPE=http|socks4|socks5

# Slack Notifications
SLACK_WEBHOOK_URL=your-slack-webhook-url

# Other
NODE_ENV=development|production
```

## Configuration

- **Symbols**: Modify `src/constants/nse.ts` to add/remove NSE symbols
- **URLs**: Update API endpoints in `src/constants/nse.ts` if NSE changes their API
- **Proxy Settings**: Configure proxy rotation parameters in the service initialization
- **Database Schema**: Ensure PostgreSQL tables are created for storing options data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Disclaimer

This project is for educational and research purposes. Ensure compliance with NSE's terms of service and applicable regulations when using this software.

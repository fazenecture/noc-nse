import { IFetchDataReqObj, IFetchExpiryDatesServiceReqObj } from "../types";

export const symbols = [
  "BANKNIFTY",
  "CNX100",
  "CNXINFRA",
  "CNXIT",
  "CNXPSE",
  "DEFTY",
  "DJIA",
  "FINNIFTY",
  "FTSE100",
  "JUNIOR",
  "MIDCPNIFTY",
  "MINIFTY",
  "NFTYMCAP50",
  "NIFTY",
  "NIFTYCPSE",
  "NIFTYINFRA",
  "NIFTYIT",
  "NIFTYMID50",
  "NIFTYNXT50",
  "NIFTYPSE",
  "S&P500",
];

export const Instrument = {
  FUTSTK: "FUTSTK",
  FUTIDX: "FUTIDX",
};

export const URLS = {
  EXPIRY_DATES: (obj: IFetchExpiryDatesServiceReqObj) =>
    `https://www.nseindia.com/api/historical/foCPV/expireDts?instrument=${obj.instrument}&symbol=${obj.symbol}&year=${obj.year}`,
  FO_CPV: (obj: IFetchDataReqObj) =>
    `https://www.nseindia.com/api/historical/foCPV?from=${obj.fromDate}&to=${obj.toDate}&instrumentType=${obj.instrument}&symbol=${symbol}&year=2025&expiryDate=${obj.expiryDate}`,
  FO_CPV_META_SYMBOL: (instrument: string) =>
    `https://www.nseindia.com/api/historical/foCPV/meta/symbolv2?instrument=${instrument}`,
};

export const API_CONFIG = {
  COOKIE: `nsit=NTu5chIBxwrRVb7tTFf1xX27; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTczOTEwOTAzMCwiZXhwIjoxNzM5MTE2MjMwfQ.La2WJT79rjslt1XnJZqkAt69sMxUpp5RDrZMgw3So2E; AKA_A2=A; bm_sz=7D9AE7ED09AC2995C163EFC74735947D~YAAQNSEPF/7dY7qUAQAA3Nj56hqfC/PMWaJ2dbmTFME4l6tzQ+gF/Kr+0+mV3ISx/RmnVUH2iEGiA+33jcvpJtKEKYnSCaVqayZQoXCgEhrAVbLtezSqVZaEkoObWMe/ywt2v99Nk+QFuZhmXQSp8BLCCyToVyayQ/4iR17Wk28sVx1YrhFmJEgIrnAiFt4BOrsPAMtdsBX0jGTy3t45tn/f8RPvYYPnoqM5HL67fWqJRrcWp09hpCBCakNQkLWGntfVy86nLfc+k1v3EQBno2ncb7C6exxKNsX2NvfGchh9GjeFQCUylTTjArlyDY9P45HX1Ti+RDKRjiIZ2P2I7BEh36CBccsHFEzKUJRV4u8FFlqR1ZvPs5G3vklH8VBTeSrYaSsdKquT5PhDLs5Q~3556916~4535617; _ga=GA1.1.1791496228.1739109033; _ga_87M7PJ3R97=GS1.1.1739109033.1.1.1739109033.60.0.0; _ga_WM2NSQKJEK=GS1.1.1739109033.1.0.1739109033.0.0.0; ak_bmsc=597574F69B484D39082BE498052ACC34~000000000000000000000000000000~YAAQPSEPF1KEULqUAQAAquf56hpBUwPpVYcnrxAJy+dctu8VGSu+i0W4g7uay7YDwFxfDytsdZ0TpaSc9blrQhOAcSphuvWeW1wGbLVozT5h4TP2ULL8Jqi7fj6iKoDxIdcc3Fej9toQMLdSx93vUva1CPnu+AdbzDTjjXUeKuZZEDB+7wULRDxnzQDgyCnDNImZEsYG/ySMDxSIFYw0E8zsxxHk5aanaeDKLCyCWry4g1y7ET8mmZ5dByOVBAUgUUYKqqzBKJDT54g0PWJVKMcwrRFxb6/Yn9qpc+8ul2rD/9U9DGtiClNdDwVerq5RFHVIWYQdZtBfLpnX+for3KiWukIAfcmIGd2Bzb17y0tLYN10NYxLTu5q36n0vfiOKuO8kBNWnJc53AimP51rIoWrKFQQ3MR5pjtTHqBFEitsa80ANW6AKYYORd0MDIYZOPqoKNKnJTeyB+3wFn0=; _abck=DD11B2178D1DC4428ACA5BA8E686B1B9~0~YAAQPSEPF1WEULqUAQAA1On56g1SIGcxpoQuXwIfzWwmLRcnkY3ZEs9rR0D0QkI3dug6vGfP+le1+cfgApCMY79Ic/Q6KJSzJ7VisJGabBY4mgi3miLPsJWga+u7ZJYeKwU+uJGj7/rbX3uhOC2mTlwcHvhHXI9i/C2u5OcY6FdhSEtWR2pNlNmf2jTFg8AydbWlA7j4IjsSVT1KgOTCxuz0flM2/lUuW3IkbOygExTcXIHeC6t0SmWfQr0dposM6HZoGy1XKcUkHRPtXze0KupIhurnDnrz6JD14r4pbOU6fmypXzNa3iveMmnauo9YUPC/mGclgBE/Nt2LmalkPKSn5sKZQitOwxi+aCkSId1AzMKGSAxP/MKDyKbjuu1cs4pbpsFz78vj0oXnz612OZq0hRl1JdemyPU8qM6PGpp1Ma8aO8/18wWevB5lJTaxXGejWI2MulRXu4Ud4B2oAwqOwPTRBwgqAbDMzt+bKvafACrqyES5qKyFpcSX~-1~||0||~-1; RT="z=1&dm=nseindia.com&si=4d996a4d-4648-4a70-b8e2-2aba382b912c&ss=m6xom3mz&sl=1&se=8c&tt=4rm&bcn=%2F%2F684d0d48.akstat.io%2F&ld=4sg"; bm_sv=25264AF1110F9F7012D5C8364C8D290A~YAAQPUo5F3gukruUAQAAlwj66hpzQR6jOHOwa9/UxsrX/j+hplVdTF4JPfQ3etwHTTOp3da5p6Q7XihNXkPKs4yP24JFx+36Vk0gdCMBi81tOKSDDgwVnqRv3WYmkjlWDYdBhdcllWkZUe3+okyor8ydo5f9Yk1p8ZtHU4PZnXLQYaC2sq1q7pWVQ0fPmDTVks3kuSGJafjgYyNC9DWW+Zi351jsIf9YmsZVPSn/Ipdw9QI98KJ7BZkFsGVbZHZujpM=~1`,
  HEADERS: {
    accept: "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
    cookie: `nsit=NTu5chIBxwrRVb7tTFf1xX27; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTczOTEwOTAzMCwiZXhwIjoxNzM5MTE2MjMwfQ.La2WJT79rjslt1XnJZqkAt69sMxUpp5RDrZMgw3So2E; AKA_A2=A; bm_sz=7D9AE7ED09AC2995C163EFC74735947D~YAAQNSEPF/7dY7qUAQAA3Nj56hqfC/PMWaJ2dbmTFME4l6tzQ+gF/Kr+0+mV3ISx/RmnVUH2iEGiA+33jcvpJtKEKYnSCaVqayZQoXCgEhrAVbLtezSqVZaEkoObWMe/ywt2v99Nk+QFuZhmXQSp8BLCCyToVyayQ/4iR17Wk28sVx1YrhFmJEgIrnAiFt4BOrsPAMtdsBX0jGTy3t45tn/f8RPvYYPnoqM5HL67fWqJRrcWp09hpCBCakNQkLWGntfVy86nLfc+k1v3EQBno2ncb7C6exxKNsX2NvfGchh9GjeFQCUylTTjArlyDY9P45HX1Ti+RDKRjiIZ2P2I7BEh36CBccsHFEzKUJRV4u8FFlqR1ZvPs5G3vklH8VBTeSrYaSsdKquT5PhDLs5Q~3556916~4535617; _ga=GA1.1.1791496228.1739109033; _ga_87M7PJ3R97=GS1.1.1739109033.1.1.1739109033.60.0.0; _ga_WM2NSQKJEK=GS1.1.1739109033.1.0.1739109033.0.0.0; ak_bmsc=597574F69B484D39082BE498052ACC34~000000000000000000000000000000~YAAQPSEPF1KEULqUAQAAquf56hpBUwPpVYcnrxAJy+dctu8VGSu+i0W4g7uay7YDwFxfDytsdZ0TpaSc9blrQhOAcSphuvWeW1wGbLVozT5h4TP2ULL8Jqi7fj6iKoDxIdcc3Fej9toQMLdSx93vUva1CPnu+AdbzDTjjXUeKuZZEDB+7wULRDxnzQDgyCnDNImZEsYG/ySMDxSIFYw0E8zsxxHk5aanaeDKLCyCWry4g1y7ET8mmZ5dByOVBAUgUUYKqqzBKJDT54g0PWJVKMcwrRFxb6/Yn9qpc+8ul2rD/9U9DGtiClNdDwVerq5RFHVIWYQdZtBfLpnX+for3KiWukIAfcmIGd2Bzb17y0tLYN10NYxLTu5q36n0vfiOKuO8kBNWnJc53AimP51rIoWrKFQQ3MR5pjtTHqBFEitsa80ANW6AKYYORd0MDIYZOPqoKNKnJTeyB+3wFn0=; _abck=DD11B2178D1DC4428ACA5BA8E686B1B9~0~YAAQPSEPF1WEULqUAQAA1On56g1SIGcxpoQuXwIfzWwmLRcnkY3ZEs9rR0D0QkI3dug6vGfP+le1+cfgApCMY79Ic/Q6KJSzJ7VisJGabBY4mgi3miLPsJWga+u7ZJYeKwU+uJGj7/rbX3uhOC2mTlwcHvhHXI9i/C2u5OcY6FdhSEtWR2pNlNmf2jTFg8AydbWlA7j4IjsSVT1KgOTCxuz0flM2/lUuW3IkbOygExTcXIHeC6t0SmWfQr0dposM6HZoGy1XKcUkHRPtXze0KupIhurnDnrz6JD14r4pbOU6fmypXzNa3iveMmnauo9YUPC/mGclgBE/Nt2LmalkPKSn5sKZQitOwxi+aCkSId1AzMKGSAxP/MKDyKbjuu1cs4pbpsFz78vj0oXnz612OZq0hRl1JdemyPU8qM6PGpp1Ma8aO8/18wWevB5lJTaxXGejWI2MulRXu4Ud4B2oAwqOwPTRBwgqAbDMzt+bKvafACrqyES5qKyFpcSX~-1~||0||~-1; RT="z=1&dm=nseindia.com&si=4d996a4d-4648-4a70-b8e2-2aba382b912c&ss=m6xom3mz&sl=1&se=8c&tt=4rm&bcn=%2F%2F684d0d48.akstat.io%2F&ld=4sg"; bm_sv=25264AF1110F9F7012D5C8364C8D290A~YAAQPUo5F3gukruUAQAAlwj66hpzQR6jOHOwa9/UxsrX/j+hplVdTF4JPfQ3etwHTTOp3da5p6Q7XihNXkPKs4yP24JFx+36Vk0gdCMBi81tOKSDDgwVnqRv3WYmkjlWDYdBhdcllWkZUe3+okyor8ydo5f9Yk1p8ZtHU4PZnXLQYaC2sq1q7pWVQ0fPmDTVks3kuSGJafjgYyNC9DWW+Zi351jsIf9YmsZVPSn/Ipdw9QI98KJ7BZkFsGVbZHZujpM=~1`,
    referer: "https://www.nseindia.com/report-detail/fo_eq_security",
    "sec-ch-ua":
      '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
};

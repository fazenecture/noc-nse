import { IFetchDataUrlObj, IFetchExpiryDatesServiceUrlObj } from "../types";

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

export const URLS = {
  EXPIRY_DATES: (obj: IFetchExpiryDatesServiceUrlObj) =>
    `https://www.nseindia.com/api/historical/foCPV/expireDts?instrument=${obj.instrument}&symbol=${obj.symbol}&year=${obj.year}`,
  FO_CPV: (obj: IFetchDataUrlObj) =>
    `https://www.nseindia.com/api/historical/foCPV?from=${obj.fromDate}&to=${obj.toDate}&instrumentType=${obj.instrument}&symbol=${obj.symbol}&year=2025&expiryDate=${obj.expiryDate}`,
  FO_CPV_META_SYMBOL: (instrument: string) =>
    `https://www.nseindia.com/api/historical/foCPV/meta/symbolv2?instrument=${instrument}`,
  NSE_WEBSITE: "https://www.nseindia.com/report-detail/fo_eq_security",
};

export const API_CONFIG = {
  HEADERS: {
    accept: "*/*",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
    cookie: `_ga=GA1.1.1791496228.1739109033; nsit=r6MdUDy4datj8xb4KAgfP_hX; nseappid=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkubnNlIiwiYXVkIjoiYXBpLm5zZSIsImlhdCI6MTc0MTAyNzQ4MiwiZXhwIjoxNzQxMDM0NjgyfQ.575BBw1FZLka3g7Xb33xM_YL5un4gL0aGaxA8vbeEo4; AKA_A2=A; bm_sz=65480F4BA08BE9957F2C62D78689C899~YAAQrF06Fw81NlCVAQAARx5TXRrMzUe9Iisp3en8SQKhy6TZusR4HNrK7eljGIzAlMcV2ZERIOu4efEY6zgraQRPMJwMmZ0okc+arDwL1SqmRNZhxqRcNIpPolSPeFfRCj6S7pcRW5Vzm/2ZnGK34dNK3jaEkpV3P04xAbFY6krBE7IDefUtl9RRGqzmhNjZlaGfyFPlsWOW89ozbeA9mt8vawQYpjsvyK+ncbwGfYjTQRCtt83twqL7moGPzrGPbkxJl2Ksx2iytA11y4W1YAsjCUhGg7F7UrqnCzhkhDH+bVVCjUPPc32ERgi5cbJeG7w5RDv2791vzbrqppZeBK09wbNQW932IBvWxHi+lF2f9YYcds1S1G5pC0/QhcCLIw04M/5huA3WlxxUpLaq~3487025~3356470; _abck=DD11B2178D1DC4428ACA5BA8E686B1B9~0~YAAQrF06F0o1NlCVAQAAUCFTXQ0YYN7EBT1Ziz9IzquzINb7G01X2lIoVQj9igwSq4iE5RnMEr3C9dFaVI4Aba24YlK46mvG75239h1QqKY02IM+Z6aj25z8zXoWP95DKvblqtCGFzy04wnnk6Hda/jQ21gUi2jg1Vr3M7OdP0YjbdFDaCzAyxXt5KHELqjPXtAgHatdDloFRO0dfwJYqmOXSXT+pFtR1/USRTQmBjzphEvlYffNocLibJlQfyAJLKqc0SBX8msf3qTcuoM+H2VhRRoBVifap+iZSGAKXsPZbxmZA04LGYrFdPzLpMNMWYXcfepEomwan3jyiTWvpRtXMH9TMHGSDsQnyVJtBUO1rkYiULj5oho+ef26WPKtjVgEyNsyh9S0iWPcRG151r+4RXA53/IvPSRAjG+OhbNm7gkEmcheraKX0cQWt0rUYII0+ycRZo1zLPYIcWtA7eWVn+6Z7MfRrTa0J0VOzcN3QQv4SiNvktTyLmET~-1~-1~-1; _ga_87M7PJ3R97=GS1.1.1741027485.9.1.1741027485.60.0.0; _ga_WM2NSQKJEK=GS1.1.1741027485.9.0.1741027485.0.0.0; ak_bmsc=7F618E792F46963631AC8DFEDBDB4F5B~000000000000000000000000000000~YAAQrF06F+01NlCVAQAApChTXRpH/arXyJoR1sGyRjoVY0jxTfbJKf5mQAbK1dMePiQHdEZol4V0BnsSh430g+uz+EsYP7B+S4E0xS350RGc6UX/Aq/Skl9ktBZ/+21agasFrYk9/2gqymZgkyE99vMluBAEvfI9Zqldnhhw1mchoeHO4HoyBjFhjDtqXpL1wKaI4nMqNo1E8tnCPqDh400mB6Nk2SE8Z0MMIrR31grohfUnvD+MNWMyCK+U2Lv3N51XXNn0laxJ4cwct2c0XYzy/dF5mGTZjimb2w9ULRu30rpfxg7UxQJQA25SU6w7muUp0hYaWW8Z/ClQD8YldgH4FeJWW9xhlt9mb2HpVzLfxueSvw9Mo+A7C93ubV0XmJ/fpxOYfFlWMzWIRJcomxB3Rdyibx41oYtvkxS2+/9cMiMiGIbegqYTCW2uN70a10EZ0ojoAITZZemMBig=; bm_sv=08907BEF2B7F7C07584B2784E1F429F5~YAAQrF06F/E1NlCVAQAAzChTXRoAxoDa9FlzCWnxqaHPCEhZ3nvDxP/ZACSdTVba+saSzmkhbNf4AQqoSCm/U8N7OD/wxODINg4Y6A8n6JQPUj2nUqBqGSD+q5SjwoW6UaTIi8veLiB6KsnoMXTOR9auZ8LdRr3zwwVxIccR5yfemBgP/emAUDWG62pheO574QhsCbRZQO1OMO/lnLtph8q7sORf8tDB1LJtam9qih2AA0q0ycO4inWbYxbANYJm4NQ=~1; RT="z=1&dm=nseindia.com&si=aeb94030-7d1f-4bc8-b3b2-24d72a6b0aa8&ss=m7tet71h&sl=1&se=8c&tt=3oy&bcn=%2F%2F684d0d47.akstat.io%2F&ld=4gw"`,
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

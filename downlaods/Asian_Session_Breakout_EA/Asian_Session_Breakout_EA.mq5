//+------------------------------------------------------------------+
//| Gold Asian Session Breakout EA (XM)                               |
//+------------------------------------------------------------------+
#property strict

#include <Trade/Trade.mqh>
CTrade trade;

// -------- INPUTS
input double LotSize = 0.01;
input int    AsianStartHour = 3;   // XM Asian start
input int    AsianEndHour   = 8;   // XM Asian end
input double RR             = 2.0; // Risk Reward
input int    MagicNumber    = 202601;

// -------- GLOBALS
double AsianHigh = 0.0;
double AsianLow  = 0.0;
bool   RangeDone = false;
bool   TradeDone = false;
int    StoredDay = -1;

//+------------------------------------------------------------------+
int OnInit()
{
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnTick()
{
   datetime now = TimeCurrent();
   MqlDateTime tm;
   TimeToStruct(now, tm);

   // Reset daily
   if(tm.day != StoredDay)
   {
      StoredDay = tm.day;
      AsianHigh = 0.0;
      AsianLow  = 0.0;
      RangeDone = false;
      TradeDone = false;
   }

   // Collect Asian range
   if(tm.hour >= AsianStartHour && tm.hour < AsianEndHour)
   {
      double high = iHigh(_Symbol, PERIOD_M5, 0);
      double low  = iLow(_Symbol, PERIOD_M5, 0);

      if(AsianHigh == 0 || high > AsianHigh)
         AsianHigh = high;

      if(AsianLow == 0 || low < AsianLow)
         AsianLow = low;
   }

   // Mark range complete
   if(tm.hour >= AsianEndHour)
      RangeDone = true;

   if(!RangeDone || TradeDone)
      return;

   // Prices
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   trade.SetExpertMagicNumber(MagicNumber);

   // BUY breakout
   if(ask > AsianHigh)
   {
      double sl = AsianLow;
      double risk = ask - sl;
      double tp = ask + (risk * RR);

      trade.Buy(LotSize, _Symbol, ask, sl, tp);
      TradeDone = true;
   }

   // SELL breakout
   if(bid < AsianLow)
   {
      double sl = AsianHigh;
      double risk = sl - bid;
      double tp = bid - (risk * RR);

      trade.Sell(LotSize, _Symbol, bid, sl, tp);
      TradeDone = true;
   }
}
//+------------------------------------------------------------------+

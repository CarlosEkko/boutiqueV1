import React from 'react';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { FormattedNumberInput } from '../../../../components/FormattedNumberInput';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../../components/ui/dialog';
import { DollarSign } from 'lucide-react';

const NewDealDialog = ({
  open, onOpenChange, client, dealData, setDealData, onCreateDeal, t,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-lg">
        <DialogHeader><DialogTitle className="text-gold-400 flex items-center gap-2"><DollarSign className="text-gold-400" />{t('otc.newOperation')} — {client?.entity_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-gray-400 text-sm">{t('otc.type')}</Label>
              <Select value={dealData.transaction_type} onValueChange={v => setDealData({...dealData, transaction_type: v})}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white"><SelectItem value="buy" className="text-white">{t('otc.buy')}</SelectItem><SelectItem value="sell" className="text-white">{t('otc.sell')}</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-gray-400 text-sm">{t('otc.value')}</Label>
              <FormattedNumberInput value={dealData.amount} onChange={v => setDealData({...dealData, amount: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="100 000" data-testid="deal-amount" /></div>
            <div><Label className="text-gray-400 text-sm">{t('otc.base')}</Label>
              <Select value={dealData.base_asset} onValueChange={v => setDealData({...dealData, base_asset: v})}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">{['BTC', 'ETH', 'USDT', 'USDC', 'SOL'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-gray-400 text-sm">{t('otc.quote')}</Label>
              <Select value={dealData.quote_asset} onValueChange={v => setDealData({...dealData, quote_asset: v})}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">{['EUR', 'USD', 'GBP', 'CHF'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-gray-400 text-sm">{t('otc.notes')}</Label><Textarea value={dealData.notes} onChange={e => setDealData({...dealData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-zinc-600" onClick={() => onOpenChange(false)}>{t('otc.cancel')}</Button>
          <Button className="bg-gold-500 hover:bg-gold-400 text-black" onClick={onCreateDeal}>{t('otc.createOperation')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDealDialog;

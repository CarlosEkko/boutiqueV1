// Backwards-compat shim — the original Upgrade-only picker is now a thin
// wrapper around the generic PaymentMethodPicker (feeType="upgrade").
import PaymentMethodPicker from './PaymentMethodPicker';

export default function UpgradePaymentMethodPicker(props) {
  return <PaymentMethodPicker feeType="upgrade" {...props} />;
}

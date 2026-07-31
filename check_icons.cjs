const l = require('lucide-react');
const icons = ['User', 'Palette', 'Bell', 'Cloud', 'Shield', 'Info', 'LogOut', 'Sparkles', 'Database', 'Lock', 'Save', 'Mail', 'CreditCard', 'XCircle', 'Download', 'Trash2', 'FileText', 'ExternalLink'];
icons.forEach(icon => {
  console.log(`${icon}: ${!!l[icon] ? 'OK' : 'MISSING'}`);
});

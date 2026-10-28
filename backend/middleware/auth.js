const supabase = require('../supabase');
async function requireAuth(req,res,next) {
  const header=req.get('Authorization')||'';
  const token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!token) return res.status(401).json({error:'Please sign in to continue.'});
  const {data,error}=await supabase.auth.getUser(token);
  if(error||!data.user) return res.status(401).json({error:'Session is invalid or expired. Please sign in again.'});
  req.user=data.user; next();
}
function requireAdmin(req,res,next) {
  if(String(req.user.email||'').toLowerCase()!==String(process.env.ADMIN_EMAIL||'').toLowerCase())
    return res.status(403).json({error:'Administrator access required.'});
  next();
}
module.exports={requireAuth,requireAdmin};
require('dotenv').config();
const express=require('express');
const path=require('path');
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const supabase=require('./supabase');
const {requireAuth,requireAdmin}=require('./middleware/auth');
const app=express();
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'30kb'}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:180,standardHeaders:true,legacyHeaders:false}));
app.use(express.static(path.join(__dirname,'..','frontend')));
const validTypes=['lost','found'];
const categories=['Electronics','Books & Notes','Clothing','Accessories','Keys & Cards','Other'];
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
app.get('/api/health',(req,res)=>res.json({status:'ok'}));
app.post('/api/auth/signup',async(req,res)=>{
 const email=clean(req.body.email,254).toLowerCase(),password=req.body.password,full_name=clean(req.body.full_name,100);
 if(!email||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<8)
  return res.status(400).json({error:'Enter a valid email and a password of at least 8 characters.'});
 const {data,error}=await supabase.auth.admin.createUser({email,password,email_confirm:false,user_metadata:{full_name}});
 if(error) return res.status(400).json({error:'Could not create account. The email may already be registered.'});
 res.status(201).json({message:'Account created. Sign in after completing any email confirmation.'});
});
app.post('/api/auth/signin',async(req,res)=>{
 const email=clean(req.body.email,254).toLowerCase(),password=req.body.password;
 if(!email||typeof password!=='string')return res.status(400).json({error:'Email and password are required.'});
 const {data,error}=await supabase.auth.signInWithPassword({email,password});
 if(error||!data.session)return res.status(401).json({error:'Incorrect email or password.'});
 res.json({session:data.session});
});
app.post('/api/auth/signout',requireAuth,async(req,res)=>res.json({message:'Signed out locally. Discard your session token.'}));
app.get('/api/items',async(req,res)=>{
 let query=supabase.from('items').select('id,type,title,category,location,item_date,description,contact,created_at,status').eq('status','active').order('created_at',{ascending:false}).limit(100);
 if(req.query.type&&validTypes.includes(req.query.type))query=query.eq('type',req.query.type);
 const {data,error}=await query;
 if(error)return res.status(500).json({error:'Could not load listings.'});
 res.json({items:data});
});
app.post('/api/items',requireAuth,async(req,res)=>{
 const b=req.body||{},type=clean(b.type,10),title=clean(b.title,90),category=clean(b.category,40),location=clean(b.location,120),item_date=clean(b.item_date,10),description=clean(b.description,1000),contact=clean(b.contact,160);
 if(!validTypes.includes(type)||!title||!categories.includes(category)||!location||!/^\d{4}-\d{2}-\d{2}$/.test(item_date)||!contact)
  return res.status(400).json({error:'Please complete all required fields with valid values.'});
 const {data,error}=await supabase.from('items').insert({user_id:req.user.id,type,title,category,location,item_date,description,contact}).select('id').single();
 if(error)return res.status(500).json({error:'Unable to save your report. Please try again.'});
 res.status(201).json({item:{id:data.id}});
});
app.get('/api/my-items',requireAuth,async(req,res)=>{
 const {data,error}=await supabase.from('items').select('*').eq('user_id',req.user.id).order('created_at',{ascending:false});
 if(error)return res.status(500).json({error:'Could not load your reports.'});res.json({items:data});
});
app.patch('/api/items/:id/resolve',requireAuth,async(req,res)=>{
 const {data,error}=await supabase.from('items').update({status:'resolved'}).eq('id',req.params.id).eq('user_id',req.user.id).eq('status','active').select('id').maybeSingle();
 if(error)return res.status(500).json({error:'Unable to update report.'});
 if(!data)return res.status(404).json({error:'Active report not found or not yours.'});
 res.json({message:'Report marked resolved.'});
});
app.delete('/api/items/:id',requireAuth,async(req,res)=>{
 const {data,error}=await supabase.from('items').delete().eq('id',req.params.id).eq('user_id',req.user.id).select('id').maybeSingle();
 if(error)return res.status(500).json({error:'Unable to delete report.'});
 if(!data)return res.status(404).json({error:'Report not found or not yours.'});res.json({message:'Report deleted.'});
});
app.get('/api/admin/items',requireAuth,requireAdmin,async(req,res)=>{
 const {data,error}=await supabase.from('items').select('*').order('created_at',{ascending:false}).limit(300);
 if(error)return res.status(500).json({error:'Unable to load admin listings.'});res.json({items:data});
});
app.patch('/api/admin/items/:id/status',requireAuth,requireAdmin,async(req,res)=>{
 const status=clean(req.body.status,20);
 if(!['active','resolved','hidden'].includes(status))return res.status(400).json({error:'Invalid status.'});
 const {data,error}=await supabase.from('items').update({status}).eq('id',req.params.id).select('id').maybeSingle();
 if(error)return res.status(500).json({error:'Unable to update listing.'});
 if(!data)return res.status(404).json({error:'Listing not found.'});res.json({message:'Listing status updated.'});
});
app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found.'}));
app.use((err,req,res,next)=>{console.error(err.message);res.status(500).json({error:'Unexpected server error.'});});
const port=Number(process.env.PORT)||3000;
app.listen(port,()=>console.log(`CampusFind running at http://localhost:${port}`));
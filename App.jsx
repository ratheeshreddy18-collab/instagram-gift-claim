import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, Check, ChevronLeft, CircleHelp, Clock3, Gift,
  Heart, Instagram, LockKeyhole, Mail, MessageCircle, Play, ShieldCheck,
  Sparkles, UserRound, Users, X
} from "lucide-react";
import { isConfigured, supabase } from "./lib/supabase";

const IG_URL = import.meta.env.VITE_INSTAGRAM_URL || "https://www.instagram.com/";
const packages = {
  Likes: [{ name: "100 Likes", value: "likes_100", amount: "100", icon: Heart, note: "A little boost" },
          { name: "500 Likes", value: "likes_500", amount: "500", icon: Heart, note: "Community favorite" },
          { name: "1,000 Likes", value: "likes_1000", amount: "1,000", icon: Heart, note: "Big appreciation" }],
  Views: [{ name: "1K Views", value: "views_1k", amount: "1K", icon: Play, note: "Start small" },
          { name: "5K Views", value: "views_5k", amount: "5K", icon: Play, note: "More reach" },
          { name: "10K Views", value: "views_10k", amount: "10K", icon: Play, note: "A bigger spotlight" }]
};

function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [service, setService] = useState("Likes");
  const [selected, setSelected] = useState("");
  const [profile, setProfile] = useState("");
  const [follows, setFollows] = useState("");
  const [message, setMessage] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);
  const [view, setView] = useState("home");
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => listener.subscription.unsubscribe();
  }, []);

  const isAdmin = session?.user?.app_metadata?.role === "admin";

  async function sendOtp(e) {
    e.preventDefault();
    setAuthError("");
    if (!isConfigured) {
      setAuthError("Authentication is not configured yet. Add your Supabase project details to the .env file first.");
      return;
    }
    if (!identifier.trim()) return setAuthError(authMode === "email" ? "Enter your email address." : "Enter your phone number with country code, e.g. +91…");
    setAuthBusy(true);
    try {
      const payload = authMode === "email"
        ? { email: identifier.trim(), options: { shouldCreateUser: true } }
        : { phone: identifier.trim(), options: { shouldCreateUser: true } };
      const { error } = await supabase.auth.signInWithOtp(payload);
      if (error) throw error;
      setOtpSent(true);
    } catch (err) {
      setAuthError(err.message || "Could not send the code. Please try again.");
    } finally { setAuthBusy(false); }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setAuthError("");
    if (!supabase) return setAuthError("Authentication is not configured yet.");
    if (!otp.trim()) return setAuthError("Enter the code you received.");
    setAuthBusy(true);
    try {
      const payload = authMode === "email"
        ? { email: identifier.trim(), token: otp.trim(), type: "email" }
        : { phone: identifier.trim(), token: otp.trim(), type: "sms" };
      const { error } = await supabase.auth.verifyOtp(payload);
      if (error) throw error;
      setShowLogin(false);
      setOtpSent(false);
      setOtp("");
      setNotice("Verified! Now choose your gift package.");
      document.getElementById("gift-options")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setAuthError(err.message || "That code could not be verified. Check it and try again.");
    } finally { setAuthBusy(false); }
  }

  function startClaim() {
    setNotice("");
    if (!session) { setShowLogin(true); return; }
    document.getElementById("gift-options")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitClaim(e) {
    e.preventDefault();
    setNotice("");
    if (!session) { setShowLogin(true); return; }
    if (!selected) return setNotice("Choose one gift package first.");
    if (!/^https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?(\?.*)?$/i.test(profile.trim())) {
      return setNotice("Enter a valid Instagram profile URL, such as https://www.instagram.com/yourusername/");
    }
    if (!follows) return setNotice("Please answer whether you follow our Instagram page.");
    if (!isConfigured || !supabase) return setNotice("Connect Supabase to submit a real request. Your information has not been sent.");
    setSubmitBusy(true);
    try {
      const [category, packageValue] = selected.split(":");
      const { error } = await supabase.from("gift_claims").insert({
        user_id: session.user.id,
        verified_contact: session.user.email || session.user.phone || "",
        contact_type: session.user.email ? "email" : "phone",
        verification_status: "verified",
        instagram_url: profile.trim(),
        follows_page: follows === "yes",
        category,
        package_key: packageValue,
        optional_message: message.trim() || null,
        status: "pending"
      });
      if (error) {
        if (error.code === "23505") throw new Error("Our records show you've already submitted a gift claim. Each verified user can claim one gift.");
        throw error;
      }
      setSuccess(true);
      setSelected(""); setProfile(""); setFollows(""); setMessage("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setNotice(err.message || "Request could not be submitted. Please try again.");
    } finally { setSubmitBusy(false); }
  }

  async function loadAdmin() {
    if (!isAdmin || !supabase) return;
    setAdminLoading(true);
    const { data, error } = await supabase.from("gift_claims").select("*").order("created_at", { ascending: false });
    if (error) setNotice(error.message); else setAdminRows(data || []);
    setAdminLoading(false);
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from("gift_claims").update({ status }).eq("id", id);
    if (error) setNotice(error.message); else setAdminRows(rows => rows.map(row => row.id === id ? { ...row, status } : row));
  }

  async function deleteRow(id) {
    if (!window.confirm("Delete this request permanently?")) return;
    const { error } = await supabase.from("gift_claims").delete().eq("id", id);
    if (error) setNotice(error.message); else setAdminRows(rows => rows.filter(row => row.id !== id));
  }

  function exportCsv() {
    const headers = ["id","created_at","verified_contact","contact_type","verification_status","instagram_url","follows_page","category","package_key","optional_message","status"];
    const quote = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(","), ...filteredRows.map(r => headers.map(h => quote(r[h])).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "gift-claims.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filteredRows = useMemo(() => adminRows.filter(row => {
    const term = search.toLowerCase();
    const matchesSearch = [row.verified_contact, row.instagram_url, row.category, row.package_key, row.id]
      .some(v => String(v || "").toLowerCase().includes(term));
    return matchesSearch && (statusFilter === "all" || row.status === statusFilter);
  }), [adminRows, search, statusFilter]);

  const closeModal = () => { setShowLogin(false); setAuthError(""); setOtpSent(false); setOtp(""); };

  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => { setView("home"); setSuccess(false); }}>
        <span className="brand-mark"><Gift size={19} /></span><span>little<span className="brand-accent">surprise</span></span>
      </a>
      <nav><a href="#how-it-works">How it works</a><a href="#gift-options">Gift options</a></nav>
      <div className="top-actions">
        {session ? <span className="signed-in"><BadgeCheck size={15} /> Verified</span> : <button className="text-button" onClick={() => setShowLogin(true)}>Log in</button>}
        {isAdmin && <button className="admin-pill" onClick={() => { setView(view === "admin" ? "home" : "admin"); loadAdmin(); }}>{view === "admin" ? "Website" : "Admin"}</button>}
      </div>
    </header>

    {view === "admin" && isAdmin ? <main className="admin-main">
      <div className="admin-heading"><div><div className="eyebrow">PRIVATE WORKSPACE</div><h1>Gift requests</h1><p>Only an authenticated site owner can access these records.</p></div><button className="button button-primary" onClick={exportCsv}>Export CSV <ArrowRight size={16} /></button></div>
      <div className="stats-grid">
        {["all","pending","approved","rejected","fulfilled"].map(s => <button key={s} className={`stat-card ${statusFilter===s?"stat-active":""}`} onClick={() => setStatusFilter(s)}><span>{s==="all"?"All requests":s[0].toUpperCase()+s.slice(1)}</span><strong>{s==="all"?adminRows.length:adminRows.filter(r=>r.status===s).length}</strong></button>)}
      </div>
      <div className="admin-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search email, Instagram, package…" /><button className="button button-secondary" onClick={loadAdmin}>Refresh</button></div>
      {adminLoading ? <p className="muted">Loading requests…</p> : <div className="table-wrap"><table><thead><tr><th>Request</th><th>Contact</th><th>Instagram</th><th>Gift</th><th>Follow?</th><th>Submitted</th><th>Status / actions</th></tr></thead><tbody>
        {filteredRows.map(row=><tr key={row.id}><td><code>{row.id.slice(0,8)}</code></td><td>{row.verified_contact}<small>{row.contact_type} · {row.verification_status}</small></td><td><a href={row.instagram_url} target="_blank" rel="noreferrer">{row.instagram_url}</a></td><td>{row.category}<small>{row.package_key}</small></td><td>{row.follows_page ? "Yes" : "No"}</td><td>{new Date(row.created_at).toLocaleString()}</td><td><select value={row.status} onChange={e=>updateStatus(row.id,e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="fulfilled">Fulfilled</option></select><button className="delete-button" onClick={()=>deleteRow(row.id)} title="Delete request"><X size={15}/></button></td></tr>)}
      </tbody></table>{!filteredRows.length&&<p className="empty-state">No requests match your search.</p>}</div>}
    </main> : success ? <main className="success-main">
      <div className="success-orb"><Check size={38}/></div><div className="eyebrow">REQUEST RECEIVED</div><h1>Your surprise is<br/><span className="gradient-text">one step closer.</span></h1>
      <p>🎉 Your request has been submitted! Thanks for joining our community. Your request is now awaiting review.</p>
      <div className="success-note"><Clock3 size={18}/><span>Gift requests are reviewed before fulfilment. Submission does not guarantee a specific delivery time.</span></div>
      <a className="button button-primary" href={IG_URL} target="_blank" rel="noreferrer"><Instagram size={18}/> Follow us on Instagram <ArrowRight size={16}/></a>
      <button className="text-button" onClick={()=>{setSuccess(false);window.scrollTo({top:0,behavior:"smooth"});}}>Back to home</button>
    </main> : <>
      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14}/> A LITTLE SOMETHING FOR YOU</div>
            <h1>Your Next Little<br/>Surprise <span className="gradient-text">Starts Here.</span> <span className="hero-emoji">🎁</span></h1>
            <p className="hero-subtitle">Pick a gift, verify your account, and send your request in just a few simple steps.</p>
            <div className="hero-actions"><button className="button button-primary button-large" onClick={startClaim}>Claim My Gift <ArrowRight size={18}/></button><a className="button button-ghost button-large" href="#gift-options">Explore gifts <ChevronLeft size={16} className="rotate-icon"/></a></div>
            <div className="trust-line"><span><ShieldCheck size={15}/> Secure verification</span><span><Clock3 size={15}/> Quick to request</span></div>
          </div>
          <div className="hero-art" aria-label="Gift illustration">
            <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
            <div className="sparkle sparkle-a">✦</div><div className="sparkle sparkle-b">✧</div><div className="sparkle sparkle-c">✦</div>
            <div className="gift-illustration"><div className="gift-lid"/><div className="gift-box"><div className="gift-ribbon-v"/><div className="gift-ribbon-h"/></div><div className="gift-bow"><span/><span/></div></div>
            <div className="float-tag tag-top"><Heart size={15} fill="currentColor"/> A little love</div><div className="float-tag tag-bottom"><Sparkles size={15}/> Your choice, your gift</div>
          </div>
        </section>

        <section className="one-gift-banner"><div className="banner-icon"><Gift size={20}/></div><div><strong>ONE USER. ONE GIFT.</strong><p>Every verified user can claim only one gift. Choose your preferred package carefully.</p></div><span className="banner-sparkle">✦</span></section>

        {notice && <div className="notice" role="status"><CircleHelp size={17}/><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}

        <section id="gift-options" className="section gift-section">
          <div className="section-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h2>Choose your <span className="gradient-text">little gift</span></h2></div><p>Select one package to continue.<br/>Your request will be reviewed.</p></div>
          <div className="category-grid">
            <button className="category-card unavailable" onClick={()=>setNotice("💜 Followers are taking a little break! But your next surprise might be waiting in Likes or Views. Explore the available gifts.")}>
              <span className="category-icon muted-icon"><Users size={21}/></span><span className="category-title">Followers</span><span className="status status-muted">Temporarily unavailable</span><span className="category-description">This option is taking a little break.</span><span className="category-link">Learn more <ArrowRight size={15}/></span>
            </button>
            <button className={`category-card ${service==="Likes"?"category-selected":""}`} onClick={()=>{setService("Likes");setSelected("");}}>
              <span className="category-icon likes-icon"><Heart size={21}/></span><span className="category-title">Likes</span><span className="status status-live">Available gifts</span><span className="category-description">Share a little appreciation.</span><span className="category-link">Explore packages <ArrowRight size={15}/></span>
            </button>
            <button className={`category-card ${service==="Views"?"category-selected":""}`} onClick={()=>{setService("Views");setSelected("");}}>
              <span className="category-icon views-icon"><Play size={21}/></span><span className="category-title">Views</span><span className="status status-live">Available gifts</span><span className="category-description">Give your content a spotlight.</span><span className="category-link">Explore packages <ArrowRight size={15}/></span>
            </button>
          </div>
          <div className="package-area">
            <div className="package-heading"><div><h3>{service} packages</h3><p>Choose just one — you can’t change it after submitting.</p></div><span className="package-count">03 OPTIONS</span></div>
            <div className="package-grid">{packages[service].map((pkg,index)=>{
              const Icon=pkg.icon; const value=`${service}:${pkg.value}`;
              return <button key={pkg.value} className={`package-card ${selected===value?"package-selected":""}`} onClick={()=>{setSelected(value);setNotice("");}}>
                <span className={`package-icon package-icon-${index}`}><Icon size={19}/></span>{selected===value&&<span className="selected-check"><Check size={13}/></span>}
                <strong>{pkg.name}</strong><span className="package-note">{pkg.note}</span><span className="package-select">{selected===value?"Selected":"Choose gift"} <ArrowRight size={14}/></span>
              </button>;
            })}</div>
          </div>
        </section>

        <section className="section claim-section" id="claim-form">
          <div className="section-heading"><div><div className="eyebrow">ALMOST THERE</div><h2>Make it <span className="gradient-text">official</span></h2></div><p>Verify your account and<br/>send your gift request.</p></div>
          <div className="steps-row"><div className={`step ${session?"step-done":"step-current"}`}><span>{session?<Check size={14}:"1"}</span><div><strong>Verify</strong><small>Email or phone OTP</small></div></div><div className={`step ${selected?"step-current":" "}`}><span>2</span><div><strong>Choose</strong><small>Your gift package</small></div></div><div className="step"><span>3</span><div><strong>Submit</strong><small>Send your request</small></div></div></div>
          <form className="claim-form" onSubmit={submitClaim}>
            {!session && <div className="verify-inline"><div className="verify-symbol"><LockKeyhole size={20}/></div><div><strong>Quick verification required</strong><p>Sign in with email or phone OTP before submitting your gift request.</p></div><button type="button" className="button button-secondary" onClick={()=>setShowLogin(true)}>Verify now <ArrowRight size={15}/></button></div>}
            <div className="form-field"><label htmlFor="profile">Your Instagram profile URL <span>*</span></label><div className="input-with-icon"><Instagram size={17}/><input id="profile" type="url" placeholder="https://www.instagram.com/yourusername/" value={profile} onChange={e=>setProfile(e.target.value)} required/></div><small>We’ll use this profile to identify your request.</small></div>
            <div className="form-field"><label>Are you following our Instagram page? <span>*</span></label><div className="choice-row"><button type="button" className={`choice ${follows==="yes"?"choice-active":""}`} onClick={()=>setFollows("yes")}><span className="choice-radio">{follows==="yes"&&<span/>}</span>Yes, I’m following</button><button type="button" className={`choice ${follows==="no"?"choice-active":""}`} onClick={()=>setFollows("no")}><span className="choice-radio">{follows==="no"&&<span/>}</span>Not yet</button></div><a className="inline-link" href={IG_URL} target="_blank" rel="noreferrer">Visit our Instagram page <ArrowRight size={13}/></a></div>
            <div className="form-field"><label htmlFor="message">A message for us <span className="optional">(optional)</span></label><div className="textarea-wrap"><MessageCircle size={17}/><textarea id="message" placeholder="Anything you’d like us to know?" rows="3" maxLength="500" value={message} onChange={e=>setMessage(e.target.value)}/></div><small className="char-count">{message.length}/500</small></div>
            <div className="form-terms"><ShieldCheck size={17}/><p>One gift per verified user. Requests may be reviewed before fulfilment and are subject to the published eligibility conditions.</p></div>
            <button className="button button-primary submit-button" type="submit" disabled={submitBusy}>{submitBusy?"Submitting request…":"Submit My Gift Request"} {!submitBusy&&<ArrowRight size={17}/>}</button>
            <p className="privacy-note"><LockKeyhole size={12}/> Your contact details and request are kept private from other visitors.</p>
          </form>
        </section>

        <section className="follow-strip"><div className="follow-icon"><Instagram size={22}/></div><div><strong>Good things are better together.</strong><p>Follow along for updates and community news.</p></div><a className="button button-secondary" href={IG_URL} target="_blank" rel="noreferrer">Follow on Instagram <ArrowRight size={15}/></a></section>
        <section className="how-section section" id="how-it-works"><div className="eyebrow">SIMPLE BY DESIGN</div><h2>Three steps. <span className="gradient-text">One little surprise.</span></h2><div className="how-grid"><div><span>01</span><strong>Verify your account</strong><p>Choose email or phone and confirm with a real OTP.</p></div><div><span>02</span><strong>Choose your gift</strong><p>Pick one available Likes or Views package.</p></div><div><span>03</span><strong>Send your request</strong><p>We’ll review it and update its status.</p></div></div></section>
      </main>
      <footer className="footer"><a className="brand" href="#top"><span className="brand-mark"><Gift size={17}/></span><span>little<span className="brand-accent">surprise</span></span></a><span>Made with a little extra care ✦</span><span>© {new Date().getFullYear()} Little Surprise</span></footer>
    </>}

    {showLogin && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeModal();}}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="modal-close" onClick={closeModal} aria-label="Close"><X size={18}/></button>
      <div className="modal-brand"><span className="brand-mark"><Gift size={20}/></span></div><div className="eyebrow">A QUICK SECURITY CHECK</div><h2 id="auth-title">{otpSent?"Check your inbox":"Claim your little gift"}</h2><p className="modal-subtitle">{otpSent?`We sent a verification code to ${identifier}.`:"Verify your email or phone to help keep gift claims fair — one verified user, one gift."}</p>
      {!otpSent ? <form onSubmit={sendOtp}>
        <div className="auth-tabs"><button type="button" className={authMode==="email"?"auth-tab active":"auth-tab"} onClick={()=>{setAuthMode("email");setIdentifier("");setAuthError("");}}><Mail size={16}/> Email</button><button type="button" className={authMode==="phone"?"auth-tab active":"auth-tab"} onClick={()=>{setAuthMode("phone");setIdentifier("");setAuthError("");}}><UserRound size={16}/> Phone</button></div>
        <label className="modal-label" htmlFor="identifier">{authMode==="email"?"Email address":"Phone number"}</label><input className="modal-input" id="identifier" type={authMode==="email"?"email":"tel"} autoComplete={authMode==="email"?"email":"tel"} placeholder={authMode==="email"?"you@example.com":"+91 98765 43210"} value={identifier} onChange={e=>setIdentifier(e.target.value)} required/>
        {authMode==="phone"&&<small className="modal-hint">Include your country code. SMS delivery requires a configured provider.</small>}
        <button className="button button-primary modal-submit" type="submit" disabled={authBusy}>{authBusy?"Sending code…":"Send verification code"} <ArrowRight size={16}/></button>
      </form> : <form onSubmit={verifyOtp}><label className="modal-label" htmlFor="otp">Verification code</label><input className="modal-input otp-input" id="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter the code" value={otp} onChange={e=>setOtp(e.target.value)} required/><button className="button button-primary modal-submit" type="submit" disabled={authBusy}>{authBusy?"Verifying…":"Verify and continue"} <ArrowRight size={16}/></button><button type="button" className="text-button resend-button" onClick={()=>{setOtpSent(false);setOtp("");setAuthError("");}}>Change email or phone</button></form>}
      {authError&&<p className="auth-error" role="alert">{authError}</p>}
      {!isConfigured&&<p className="config-warning">Setup required: add Supabase URL and publishable key to .env. This form will not send a code until configured.</p>}
      <div className="modal-security"><ShieldCheck size={15}/> Codes are handled by the authentication provider, not stored with gift requests.</div>
    </section></div>}
  </div>;
}

export default App;

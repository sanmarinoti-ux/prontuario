"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = { id: string; full_name: string; registration: string | null; department: string | null; job_title: string | null; status: "ativo" | "desligado" };
type Note = { id: string; category: string; description: string; created_at: string; created_by: string; author_name: string };
const categories = ["Feedback positivo", "Orientação profissional", "Desempenho", "Treinamento", "Atendimento ao cliente", "Ocorrência / medida disciplinar", "Frequência / pontualidade", "Acompanhamento", "Outro"];

export default function Home() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [employeeModal, setEmployeeModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [success, setSuccess] = useState("");

  async function verifySession() {
    if (!supabase) { setError("O sistema ainda não está conectado ao banco de dados. Configure o Supabase."); setSessionReady(true); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUserEmail(""); setSessionReady(true); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
    if (profileError || profile?.role !== "rh") {
      await supabase.auth.signOut();
      setError("Esta conta não possui autorização de RH. Solicite acesso ao administrador.");
      setUserEmail("");
    } else {
      setUserEmail(session.user.email ?? "Usuário RH");
      await loadEmployees();
    }
    setSessionReady(true);
  }

  async function loadEmployees() {
    if (!supabase) return;
    const { data, error } = await supabase.from("employees").select("id,full_name,registration,department,job_title,status").order("full_name");
    if (error) setError("Não foi possível carregar os funcionários. Verifique sua autorização.");
    else setEmployees((data ?? []) as Employee[]);
  }

  async function loadNotes(employee: Employee) {
    if (!supabase) return;
    const { data, error } = await supabase.from("employee_notes").select("id,category,description,created_at,created_by").eq("employee_id", employee.id).order("created_at", { ascending: false });
    if (error) { setError("Não foi possível consultar as anotações."); return; }
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id,display_name");
    if (profilesError) { setError("Não foi possível identificar o autor das anotações."); return; }
    const authorNames = new Map((profiles ?? []).map(profile => [profile.id, profile.display_name]));
    setNotes((data ?? []).map(note => ({ ...note, author_name: authorNames.get(note.created_by) || "Usuário RH" })) as Note[]);
  }

  useEffect(() => {
    void verifySession();
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUserEmail(""); setEmployees([]); setNotes([]); setSelected(null); }
      else { setTimeout(() => { void verifySession(); }, 0); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const filtered = useMemo(() => employees.filter(e => e.full_name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")) || (e.registration ?? "").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [employees, search]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(`Falha no login: ${error.message}`);
    else { setPassword(""); await verifySession(); }
    setBusy(false);
  }

  async function logout() { if (supabase) await supabase.auth.signOut(); setUserEmail(""); setEmployees([]); setSelected(null); }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (newPassword.length < 8) { setError("A nova senha deve ter pelo menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("A confirmação não corresponde à nova senha."); return; }
    setPasswordBusy(true); setError(""); setSuccess("");
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword });
    if (verifyError) { setError("A senha atual está incorreta. Confira e tente novamente."); setPasswordBusy(false); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) { setError(`Não foi possível alterar a senha: ${updateError.message}`); setPasswordBusy(false); return; }
    setPasswordModal(false); setSuccess("Senha alterada com sucesso."); setPasswordBusy(false);
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const payload = { full_name: String(form.get("name") || "").trim(), registration: String(form.get("registration") || "").trim() || null, department: String(form.get("department") || "").trim() || null, job_title: String(form.get("job_title") || "").trim() || null };
    if (!payload.full_name) return;
    const { error } = await supabase.from("employees").insert(payload);
    if (error) setError(error.message.includes("duplicate") ? "Já existe um funcionário com essa matrícula." : "Não foi possível salvar o funcionário.");
    else { setEmployeeModal(false); await loadEmployees(); }
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !selected) return;
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("employee_notes").insert({ employee_id: selected.id, category: String(form.get("category")), description: String(form.get("description") || "").trim() });
    if (error) setError("Não foi possível salvar a anotação.");
    else { setNoteModal(false); await loadNotes(selected); }
  }

  if (!sessionReady) return <main className="auth-screen"><div className="auth-card"><div className="auth-logo">RH</div><h1>Prontuário San Marino</h1><p>Verificando acesso seguro...</p></div></main>;

  if (!userEmail) return <main className="auth-screen"><form className="auth-card" onSubmit={login}><div className="auth-logo">RH</div><span className="auth-kicker">ÁREA RESTRITA</span><h1>Prontuário San Marino</h1><p className="auth-description">Entre com sua conta autorizada para acessar os registros dos funcionários.</p>{error && <div className="error">{error}</div>}<label>E-mail<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="seu.email@empresa.com"/></label><label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Sua senha"/></label><button className="login-button" disabled={busy || !supabase}>{busy ? "Entrando..." : "Entrar no sistema"}</button><small className="auth-foot">Acesso exclusivo para usuários cadastrados e autorizados pelo RH.</small></form></main>;

  return <main className="shell"><aside className="sidebar"><div className="brand"><span className="logo">RH</span><div><b>Prontuário San Marino</b><small>Gestão de pessoas</small></div></div><p className="nav-label">MENU PRINCIPAL</p><div className="nav active">▦　Funcionários</div><div className="nav">▤　Prontuários</div><div className="side-foot">Acesso interno · RH</div></aside><section className="main"><header><div><small>GESTÃO DE PESSOAS</small><h1>Funcionários</h1></div><div className="user-menu"><span>{userEmail}</span><button className="change-password" onClick={()=>{setError("");setSuccess("");setPasswordModal(true);}}>Alterar senha</button><button className="logout" onClick={()=>void logout()}>Sair</button></div></header><div className="intro"><div><h2>Prontuário de funcionários</h2><p>Pesquise pelo nome ou matrícula e consulte o histórico individual.</p></div><button onClick={()=>setEmployeeModal(true)}>＋ Novo funcionário</button></div>{error&&<p className="error">{error}</p>}{success&&<p className="success">{success}</p>}<div className="columns"><section className="panel"><h3>Lista de funcionários <small>{employees.length} cadastro(s)</small></h3><input className="search" placeholder="Pesquisar por nome ou matrícula..." value={search} onChange={e=>setSearch(e.target.value)}/>{filtered.length===0?<p className="empty">Nenhum funcionário encontrado.</p>:filtered.map(e=><button className={"person "+(selected?.id===e.id?"chosen":"")} key={e.id} onClick={()=>{setSelected(e);void loadNotes(e);}}><span className="initials">{e.full_name.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}</span><span className="person-info"><b>{e.full_name}</b><small>{e.job_title||"Cargo não informado"} · {e.department||"Setor não informado"}</small></span><em>{e.status==="ativo"?"Ativo":"Desligado"}</em></button>)}</section><section className="panel record">{!selected?<div className="empty-state"><div>▤</div><h3>Selecione um funcionário</h3><p>O histórico e as anotações aparecerão aqui.</p></div>:<><div className="record-head"><div><small>PRONTUÁRIO INDIVIDUAL</small><h2>{selected.full_name}</h2><p>{selected.job_title||"Cargo não informado"} · {selected.department||"Setor não informado"}</p></div><button onClick={()=>setNoteModal(true)}>＋ Nova anotação</button></div><p className="meta">Matrícula: <b>{selected.registration||"—"}</b>　·　Situação: <b>{selected.status}</b></p><h3>Histórico de anotações</h3>{notes.length===0?<p className="empty">Ainda não existem anotações.</p>:notes.map(n=><article className="note" key={n.id}><div><b>{n.category}</b><time>{new Date(n.created_at).toLocaleString("pt-BR")}</time></div><p>{n.description}</p><small className="note-author">Registrado por: {n.author_name}</small></article>)}</>}</section></div><footer>Prontuário San Marino · Uso interno e restrito · Registros profissionais confidenciais.</footer></section>
  {passwordModal&&<div className="backdrop"><form className="modal" onSubmit={changePassword}><h2>Alterar senha</h2><p>Informe sua senha atual e escolha uma nova senha com pelo menos 8 caracteres.</p><label>Senha atual<input name="currentPassword" type="password" autoComplete="current-password" required autoFocus/></label><label>Nova senha<input name="newPassword" type="password" autoComplete="new-password" minLength={8} required/></label><label>Confirmar nova senha<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required/></label><div className="actions"><button type="button" className="secondary" onClick={()=>setPasswordModal(false)}>Cancelar</button><button disabled={passwordBusy}>{passwordBusy?"Alterando...":"Salvar nova senha"}</button></div></form></div>}
  {employeeModal&&<div className="backdrop"><form className="modal" onSubmit={saveEmployee}><h2>Novo funcionário</h2><label>Nome completo *<input name="name" required autoFocus/></label><label>Matrícula<input name="registration"/></label><label>Setor<input name="department"/></label><label>Cargo<input name="job_title"/></label><div className="actions"><button type="button" className="secondary" onClick={()=>setEmployeeModal(false)}>Cancelar</button><button>Salvar</button></div></form></div>}
  {noteModal&&selected&&<div className="backdrop"><form className="modal" onSubmit={saveNote}><h2>Nova anotação</h2><p>Funcionário: <b>{selected.full_name}</b></p><label>Categoria<select name="category">{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Descrição *<textarea name="description" rows={6} required placeholder="Registre os fatos de forma objetiva e profissional."/></label><p className="hint">Inclua somente informações profissionais necessárias. Evite dados pessoais sensíveis desnecessários.</p><div className="actions"><button type="button" className="secondary" onClick={()=>setNoteModal(false)}>Cancelar</button><button>Salvar anotação</button></div></form></div>}</main>;
}

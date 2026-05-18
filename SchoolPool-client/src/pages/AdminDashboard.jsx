import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../api'


export default function AdminDashboard() {
    const [users, setUsers] = useState([])
    const [docs, setDocs] = useState([])
    const [tab, setTab] = useState('users')

    useEffect(() => {
        api.get('/admin/users').then(r => setUsers(r.data))
        api.get('/admin/verifications').then(r => setDocs(r.data))
    }, [])

    async function verifyUser(id) {
        await api.put(`/admin/users/${id}/verify`)
        setUsers(users.map(u => u.userId === id ? { ...u, isActive: true } : u))
    }

    async function approveDoc(id) {
        await api.put(`/admin/verifications/${id}/approve`)
        setDocs(docs.filter(d => d.verificationId !== id))
    }

    return (
        <>
            <Navbar />
            <div className="page">
                <h2>Admin Dashboard</h2>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button className={`btn ${tab === 'users' ? '' : 'btn-secondary'}`}
                        style={{ width: 'auto', padding: '8px 20px' }}
                        onClick={() => setTab('users')}>Users ({users.length})</button>
                    <button className={`btn ${tab === 'docs' ? '' : 'btn-secondary'}`}
                        style={{ width: 'auto', padding: '8px 20px' }}
                        onClick={() => setTab('docs')}>Pending Docs ({docs.length})</button>
                </div>

                {tab === 'users' && users.map(u => (
                    <div className="card" key={u.userId}>
                        <div className="card-info">
                            <h4>{u.fullName} ({u.role})</h4>
                            <p>{u.email} | {u.isActive ? '✅ Active' : '⚠️ Inactive'}</p>
                        </div>
                        {!u.isActive &&
                            <button className="btn" style={{ width: 'auto', padding: '8px 16px' }}
                                onClick={() => verifyUser(u.userId)}>Verify</button>}
                    </div>
                ))}

                {tab === 'docs' && docs.map(d => (
                    <div className="card" key={d.verificationId}>
                        <div className="card-info">
                            <h4>{d.documentType}</h4>
                            <p>User: {d.user?.fullName} | Uploaded: {new Date(d.uploadedAt).toLocaleDateString()}</p>
                        </div>
                        <button className="btn" style={{ width: 'auto', padding: '8px 16px' }}
                            onClick={() => approveDoc(d.verificationId)}>Approve</button>
                    </div>
                ))}
            </div>
        </>
    )
}
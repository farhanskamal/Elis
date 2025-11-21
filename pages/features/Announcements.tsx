import React, { useState, useEffect, useContext } from 'react';
import { api } from '../../services/apiService';
import { Announcement, Role } from '../../types';
import { AuthContext } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const Announcements: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Form state
    const [editingAnno, setEditingAnno] = useState<Announcement | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const fetchAnnouncements = async () => {
        setLoading(true);
        const data = await api.getAnnouncements();
        setAnnouncements(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const resetForm = () => {
        setTitle('');
        setContent('');
        setImageUrl('');
        setEditingAnno(null);
        setIsFormOpen(false);
    };

    const handleEditClick = (anno: Announcement) => {
        setEditingAnno(anno);
        setTitle(anno.title);
        setContent(anno.content);
        setImageUrl(anno.imageUrl || '');
        setIsFormOpen(true);
    };

    const handleDelete = async (annoId: string) => {
        if (window.confirm('Are you sure you want to delete this announcement?')) {
            try {
                await api.deleteAnnouncement(annoId);
                await fetchAnnouncements();
            } catch (error) {
                console.error('Error deleting announcement:', error);
                alert('Failed to delete announcement. Please try again.');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title || !content) return;
        
        try {
            if (editingAnno) {
                await api.updateAnnouncement(editingAnno.id, title, content, imageUrl || undefined);
            } else {
                await api.createAnnouncement(title, content, imageUrl || undefined);
            }
            resetForm();
            await fetchAnnouncements();
        } catch (error) {
            console.error('Error saving announcement:', error);
            alert('Failed to save announcement. Please try again.');
        }
    };
    
    if (loading) return <div className="flex justify-center"><Spinner /></div>;

    const renderForm = () => (
        <Card className="mb-6">
            <form onSubmit={handleSubmit}>
                <h2 className="text-xl font-semibold mb-4">{editingAnno ? 'Edit Announcement' : 'New Announcement'}</h2>
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className="w-full p-2 border rounded-md"
                    />
                    <textarea
                        placeholder="Content..."
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        required
                        className="w-full p-2 border rounded-md h-24"
                    />
                     <input 
                        type="text" 
                        placeholder="Image URL (optional)"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                    <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                    <Button type="submit">{editingAnno ? 'Update' : 'Post'}</Button>
                </div>
            </form>
        </Card>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-gray-800">Announcements</h1>
                 {user?.role === Role.Librarian && (
                   <div className="flex items-center gap-2">
                     {!isFormOpen && (
                       <Button onClick={() => setIsFormOpen(true)}>
                         <PlusIcon className="w-4 h-4 mr-2" />
                         Create New Announcement
                       </Button>
                     )}
                     <Button variant="secondary" onClick={async ()=>{ try{ const d=await api.exportAnnouncements(); const blob=new Blob([JSON.stringify(d,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='announcements.json'; a.click(); URL.revokeObjectURL(url);}catch{ try{ const fallback={ announcements: announcements.map(a=>({ title:a.title, content:a.content, imageUrl:a.imageUrl||null, createdAt:a.createdAt }))}; const blob=new Blob([JSON.stringify(fallback,null,2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='announcements.json'; a.click(); URL.revokeObjectURL(url);}catch{ alert('Export JSON failed'); } } }}>Export JSON</Button>
                     <label className="inline-flex items-center">
                       <input type="file" accept="application/json" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const t=await f.text(); const p=JSON.parse(t); await api.importAnnouncements(p.announcements||[]); fetchAnnouncements(); }catch{ alert('Import JSON failed'); } finally{ e.currentTarget.value=''; } }} />
                       <Button variant="secondary" onClick={(ev)=> ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import JSON</Button>
                     </label>
                     <Button variant="secondary" onClick={async ()=>{ try{ const d=await api.exportAnnouncements(); const rows = d.announcements.map(a=>({ title:a.title, content:a.content, imageUrl:a.imageUrl||'', createdAt:a.createdAt })); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('announcements.csv', rows, ['title','content','imageUrl','createdAt']); }catch{ try{ const rows = announcements.map(a=>({ title:a.title, content:a.content, imageUrl:a.imageUrl||'', createdAt:a.createdAt })); const { downloadCsv } = await import('../../utils/csv'); downloadCsv('announcements.csv', rows, ['title','content','imageUrl','createdAt']); }catch{ alert('Export CSV failed'); } } }}>Export CSV</Button>
                     <label className="inline-flex items-center">
                       <input type="file" accept="text/csv" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; try{ const t=await f.text(); const { parseCsv } = await import('../../utils/csv'); const rows=parseCsv(t); const arr = rows.map(r=>({ title:r.title, content:r.content, imageUrl: r.imageUrl||undefined, createdAt: r.createdAt||undefined })); await api.importAnnouncements(arr); fetchAnnouncements(); }catch{ alert('Import CSV failed'); } finally{ e.currentTarget.value=''; } }} />
                       <Button variant="secondary" onClick={(ev)=> ((ev.currentTarget.previousElementSibling as HTMLInputElement) || (ev.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement))?.click()}>Import CSV</Button>
                     </label>
                   </div>
                 )}
            </div>
            
            {user?.role === Role.Librarian && isFormOpen && renderForm()}

            <div className="space-y-4">
                {announcements.map(anno => (
                    <Card key={anno.id}>
                        <div className="flex justify-between items-start">
                             <h2 className="text-xl font-bold text-gray-900">{anno.title}</h2>
                             {user?.role === Role.Librarian && (
                                <div className="flex space-x-2 text-sm">
                                    <button onClick={() => handleEditClick(anno)} className="font-medium text-blue-600 hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(anno.id)} className="font-medium text-red-600 hover:underline">Delete</button>
                                </div>
                             )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Posted by {anno.authorName} on {new Date(anno.createdAt).toLocaleString()}
                            {anno.updatedAt && <span className="italic"> (edited on {new Date(anno.updatedAt).toLocaleString()})</span>}
                        </p>
                        <p className="mt-3 text-gray-700 whitespace-pre-wrap">{anno.content}</p>
                        {anno.imageUrl && <img src={anno.imageUrl} alt={anno.title} className="mt-4 rounded-lg shadow-sm max-h-80" />}
                    </Card>
                ))}
            </div>
        </div>
    );
};

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

export default Announcements;

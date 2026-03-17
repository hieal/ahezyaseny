import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { Clock, FileUp } from 'lucide-react';
import { CandidateCard } from '../components/CandidateCard';
import { parseCandidatePDF } from '../utils/pdfParser';

const InitialContactPage = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCandidates();
    fetchAdmins();
  }, []);

  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*, profiles(full_name)');
    if (error) toast.error('שגיאה בטעינת מועמדים');
    else setCandidates(data || []);
  };

  const fetchAdmins = async () => {
    const { data } = await supabase.from('profiles').select('id, affiliation_group, full_name');
    setAdmins(data || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseCandidatePDF(file);
        
        let affiliation_group = parsed.affiliation_group;
        if (!affiliation_group && parsed.age) {
          if (parsed.age >= 20 && parsed.age <= 35) {
            affiliation_group = 'פרויקט שח"ם 20-35';
          } else if (parsed.age >= 36) {
            affiliation_group = 'פרויקט שח"ם 36-50';
          }
        }
        
        const candidateData: any = {
          full_name: parsed.full_name || 'ללא שם',
          phone: parsed.phone || null,
          affiliation_group: affiliation_group || null
        };

        console.log('Final data to save:', candidateData);
        const { error } = await supabase.from('candidates').insert(candidateData);
        
        if (error) {
          console.error(`Error inserting candidate from ${file.name}:`, error);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error parsing PDF ${file.name}:`, err);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} מועמדים נוספו בהצלחה`);
      fetchCandidates();
    }
    if (failCount > 0) {
      toast.error(`שגיאה בייבוא ${failCount} קבצים`);
    }
    
    setLoading(false);
    // Reset the input value so the same files can be selected again if needed
    e.target.value = '';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">מעקב קשר ראשוני</h1>
      
      <div className="mb-6">
        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${loading ? 'bg-slate-400' : 'bg-luxury-blue hover:bg-luxury-blue/90'} text-white`}>
          <FileUp size={20} />
          <span>{loading ? 'מעבד PDF...' : 'העלה PDF מועמד'}</span>
          <input type="file" accept=".pdf" multiple className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map(c => (
          <CandidateCard 
            key={c.id} 
            candidate={{
              id: c.id,
              full_name: c.full_name,
              phone: c.phone,
              age: c.age,
              city: c.city,
              ethnicity: c.ethnicity,
              marital_status: c.marital_status,
              occupation: c.occupation,
              about: c.about,
              looking_for: c.looking_for,
              image_url: c.image_url,
              admin_name: c.profiles?.full_name
            }} 
          />
        ))}
      </div>
    </div>
  );
};

export default InitialContactPage;

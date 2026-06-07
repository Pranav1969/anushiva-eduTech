// src/app/admin/components/FormEstablishGroup.tsx
"use client";

import { useState, useEffect } from "react";
import { FolderPlus, Trash2, Users, UserPlus, UserMinus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface FormProps {
  onSuccess: () => void; // Keeps main dashboard data synchronized
}

export default function FormEstablishGroup({ onSuccess }: FormProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  
  // Local loading states
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // 1. Fetch all created groups and student baseline lists
  const fetchGroupsAndStudents = async () => {
    setLoadingGroups(true);
    try {
      const { data: gData } = await supabase.from("groups").select("*").order("name", { ascending: true });
      const { data: sData } = await supabase.from("students").select("id, name, username").order("name", { ascending: true });
      
      if (gData) setGroups(gData);
      if (sData) setAllStudents(sData);
    } catch (err) {
      console.error("Error loading groups metadata:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // 2. Fetch specific members mapped to a group cluster
  const fetchGroupMembers = async (groupId: string) => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("student_groups")
        .select(`
          id,
          student_id,
          students ( id, name, username )
        `)
        .eq("group_id", groupId);

      if (error) throw error;
      setGroupMembers(data || []);
    } catch (err) {
      console.error("Error loading group members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchGroupsAndStudents();
  }, []);

  // Handle accordion toggle for managing students inside a group
  const toggleGroupExpand = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setGroupMembers([]);
    } else {
      setExpandedGroupId(groupId);
      setSelectedStudentId("");
      await fetchGroupMembers(groupId);
    }
  };

  // 3. Action: Create a Group Cluster
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const { error } = await supabase.from("groups").insert({
      name: newGroupName.trim()
    });

    if (error) {
      alert("Error creating cluster group: " + error.message);
    } else {
      setNewGroupName("");
      fetchGroupsAndStudents(); // Update local listings
      onSuccess(); // Sync global dashboard telemetry
    }
  };

  // 4. Action: Delete an Entire Group
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${groupName}"? This will unlink all members.`)) return;
    
    // Cascading deletion handles student unlinking automatically depending on foreign keys,
    // but clearing the join table explicitly prevents edge-case errors.
    await supabase.from("student_groups").delete().eq("group_id", groupId);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      alert("Error removing group: " + error.message);
    } else {
      if (expandedGroupId === groupId) setExpandedGroupId(null);
      fetchGroupsAndStudents();
      onSuccess();
    }
  };

  // 5. Action: Inject a Student into an Active Group from Drawer
  const handleAddStudentToGroup = async (groupId: string) => {
    if (!selectedStudentId) return;

    const { error } = await supabase.from("student_groups").insert({
      group_id: groupId,
      student_id: selectedStudentId
    });

    if (error) {
      alert("This student is already paired to this active cluster.");
    } else {
      setSelectedStudentId("");
      fetchGroupMembers(groupId);
    }
  };

  // 6. Action: Sever student relationship from group
  const handleRemoveStudentFromGroup = async (linkId: string, groupId: string) => {
    const { error } = await supabase.from("student_groups").delete().eq("id", linkId);

    if (error) {
      alert("Could not remove student connection: " + error.message);
    } else {
      fetchGroupMembers(groupId);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: CREATION FORM INPUT */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
          <FolderPlus size={14} className="text-purple-400"/>
          <h2 className="text-xs font-black text-[#A855F7] uppercase tracking-wider">Establish Student Group</h2>
        </div>
        <form onSubmit={handleCreateGroup} className="space-y-3">
          <input 
            type="text" 
            placeholder="Group / Class Name (e.g. Batch A)" 
            value={newGroupName} 
            onChange={e => setNewGroupName(e.target.value)} 
            className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors" 
            required 
          />
          <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-600/10">
            Create Cluster
          </button>
        </form>
      </div>

      {/* SECTION B: LIVE ACTIVE GROUPS LIST WITH INTERACTIVE DRAWER */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
          <Users size={14} className="text-indigo-400"/>
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider">Active Group Clusters ({groups.length})</h3>
        </div>

        {loadingGroups ? (
          <div className="flex items-center justify-center py-6 text-slate-500 gap-2 text-xs">
            <Loader2 className="animate-spin w-4 h-4 text-purple-500" />
            <span>Scanning cloud directories...</span>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-slate-500 text-xs py-6 font-medium border border-dashed border-slate-800 rounded-xl">
            No student groups structured inside the database yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {groups.map((group) => {
              const isExpanded = expandedGroupId === group.id;
              return (
                <div 
                  key={group.id} 
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isExpanded ? "bg-slate-900/60 border-purple-500/40" : "bg-slate-900/30 border-slate-800/80 hover:border-slate-700/80"
                  }`}
                >
                  {/* Accordion Trigger Row */}
                  <div className="p-3 flex items-center justify-between cursor-pointer select-none" onClick={() => toggleGroupExpand(group.id)}>
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isExpanded ? "bg-purple-500/10 text-purple-400" : "bg-slate-800/60 text-slate-400"}`}>
                        <Users size={12} />
                      </div>
                      <span className="text-xs font-bold text-slate-200">{group.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="p-1.5 bg-slate-900 border border-slate-800 hover:border-red-500/40 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button 
                        onClick={() => toggleGroupExpand(group.id)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Accordion Expand Drawer */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/60 bg-slate-950/40 p-3 space-y-3">
                      
                      {/* Sub-form: Directly insert student right here */}
                      <div className="flex gap-1.5">
                        <select 
                          value={selectedStudentId} 
                          onChange={e => setSelectedStudentId(e.target.value)} 
                          className="flex-1 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-lg p-2 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Add student directly --</option>
                          {allStudents.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.name} ({student.username})
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={() => handleAddStudentToGroup(group.id)}
                          disabled={!selectedStudentId}
                          className="px-3 bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white rounded-lg transition-all text-xs flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <UserPlus size={12} />
                          <span className="hidden sm:inline">Add</span>
                        </button>
                      </div>

                      {/* Displaying Live Members */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Current Class Roster:</span>
                        
                        {loadingMembers ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 py-2">
                            <Loader2 className="animate-spin w-3 h-3 text-indigo-400" />
                            <span>Polling profiles...</span>
                          </div>
                        ) : groupMembers.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic py-1 pl-1">No students registered in this group cluster.</p>
                        ) : (
                          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5">
                            {groupMembers.map((member) => {
                              const studentInfo: any = member.students;
                              if (!studentInfo) return null;
                              return (
                                <div key={member.id} className="flex items-center justify-between p-1.5 pl-2 bg-slate-900/40 border border-slate-800/40 rounded-lg group/row hover:bg-slate-900/80 transition-colors">
                                  <div className="text-[11px]">
                                    <span className="font-semibold text-slate-300">{studentInfo.name}</span>
                                    <span className="text-slate-500 font-mono ml-1.5">({studentInfo.username})</span>
                                  </div>
                                  <button 
                                    onClick={() => handleRemoveStudentFromGroup(member.id, group.id)}
                                    className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100"
                                    title="Sever Student connection from group"
                                  >
                                    <UserMinus size={11} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
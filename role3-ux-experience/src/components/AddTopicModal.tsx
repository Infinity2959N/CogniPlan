"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import { useQueryClient } from "@tanstack/react-query";

export default function AddTopicModal() {
  const { isAddTopicModalOpen, closeAddTopicModal, isGroupMode } = useUIStore();
  const queryClient = useQueryClient();
  const [topicName, setTopicName] = useState("");
  const [subject, setSubject] = useState("");

  if (!isAddTopicModalOpen) return null;

  const handleSubmit = () => {
    if (!topicName.trim()) return;
    const topicTitle = topicName.trim();
    const created = {
      id: `t-added-${Date.now()}`,
      title: topicTitle,
      subject: subject.trim() || "General",
      status: "learning" as const,
      lastReviewed: new Date(),
      nextReview: new Date(),
      easeFactor: 2.5,
      repetitions: 0,
      interval: 1,
      isGroup: isGroupMode,
    };

    queryClient.setQueryData<{ topics: any[] }>(["topics"], (oldData) => {
      if (!oldData?.topics) return { topics: [created] };
      return {
        topics: [created, ...oldData.topics],
      };
    });

    setTopicName("");
    setSubject("");
    closeAddTopicModal();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="dark:bg-slate-800 bg-white rounded-lg border dark:border-slate-700 border-slate-200 p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-800">Add New Topic</h2>
          <button onClick={closeAddTopicModal} className="dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <InputField
            label="Topic Name"
            placeholder="e.g. CPU scheduling"
            value={topicName}
            onChange={setTopicName}
          />
          <InputField
            label="Subject (optional)"
            placeholder="e.g. Computer Science"
            value={subject}
            onChange={setSubject}
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={closeAddTopicModal} variant="ghost" label="Cancel" className="flex-1" />
            <Button onClick={handleSubmit} label="Add Topic" className="flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
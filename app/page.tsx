"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface UserActivity {
  username: string;
  commits: number;
  prs: number;
  reviews: number;
  issues: number;
  totalActivity: number;
  avgCommitsPerDay: number;
  status: "baixa" | "normal" | "alta";
}

const COLORS = {
  baixa: "#ef4444",
  normal: "#22c55e",
  alta: "#f59e0b",
};

export default function Home() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [githubToken, setGithubToken] = useState("");
  const [githubOrg, setGithubOrg] = useState("");
  const [configured, setConfigured] = useState(false);

  const fetchActivities = async () => {
    if (!githubToken || !githubOrg) {
      setError("Por favor, configure o token e organização do GitHub");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/github-activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: githubToken, org: githubOrg, days }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar atividades");
      }

      const data = await response.json();
      setActivities(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar atividades do GitHub");
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubToken && githubOrg) {
      setConfigured(true);
      fetchActivities();
    }
  };

  const statusDistribution = activities.reduce(
    (acc, user) => {
      acc[user.status]++;
      return acc;
    },
    { baixa: 0, normal: 0, alta: 0 }
  );

  const pieData = [
    { name: "Baixa Atividade", value: statusDistribution.baixa },
    { name: "Atividade Normal", value: statusDistribution.normal },
    { name: "Alta Atividade", value: statusDistribution.alta },
  ];

  if (!configured) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">
              Monitor de Atividade GitHub
            </h1>
            <p className="text-gray-600 mb-8">
              Configure suas credenciais do GitHub para começar
            </p>

            <form onSubmit={handleConfigure} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="ghp_..."
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Necessário permissões: repo, read:org, read:user
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Organização
                </label>
                <input
                  type="text"
                  value={githubOrg}
                  onChange={(e) => setGithubOrg(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="sua-empresa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período de Análise (dias)
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                >
                  <option value={7}>7 dias</option>
                  <option value={14}>14 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={60}>60 dias</option>
                  <option value={90}>90 dias</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Iniciar Monitoramento
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Monitor de Atividade GitHub
            </h1>
            <p className="text-gray-400">
              Organização: {githubOrg} • Últimos {days} dias
            </p>
          </div>
          <div className="flex gap-4">
            <select
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value));
                fetchActivities();
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
            <button
              onClick={fetchActivities}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Carregando..." : "Atualizar"}
            </button>
            <button
              onClick={() => {
                setConfigured(false);
                setActivities([]);
              }}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Reconfigurar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-xl">Carregando atividades...</div>
          </div>
        ) : activities.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Total de Colaboradores
                </h3>
                <p className="text-4xl font-bold text-blue-600">
                  {activities.length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Baixa Atividade
                </h3>
                <p className="text-4xl font-bold text-red-500">
                  {statusDistribution.baixa}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Alta Atividade
                </h3>
                <p className="text-4xl font-bold text-yellow-500">
                  {statusDistribution.alta}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                  Distribuição de Status
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? COLORS.baixa
                              : index === 1
                              ? COLORS.normal
                              : COLORS.alta
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                  Atividade Total por Colaborador
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activities.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="username" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalActivity" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  Detalhes por Colaborador
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Colaborador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pull Requests
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reviews
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issues
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Média Commits/Dia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((user) => (
                      <tr key={user.username} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {user.commits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {user.prs}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {user.reviews}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {user.issues}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {user.avgCommitsPerDay.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                          {user.totalActivity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === "baixa"
                                ? "bg-red-100 text-red-800"
                                : user.status === "alta"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {user.status === "baixa"
                              ? "Baixa"
                              : user.status === "alta"
                              ? "Alta"
                              : "Normal"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <p className="text-gray-600 text-lg">
              Clique em &quot;Atualizar&quot; para carregar as atividades
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

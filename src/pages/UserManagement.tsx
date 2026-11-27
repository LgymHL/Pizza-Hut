import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ChevronDown, Mail, Plus, RefreshCw, Send, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createInvitation, getInvitations, getManagedUsers, getUnits, revokeInvitation, sendInvitation, updateManagedUser } from '../services/users.service'
import type { Invitation, InvitationStatus, ManagedUser, Unit } from '../services/users.service'

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-hut-red'

const statusLabels: Record<InvitationStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  ACCEPTED: 'Aceito',
  REVOKED: 'Revogado',
}

function getStatusClass(status: InvitationStatus) {
  switch (status) {
    case 'SENT':
      return 'bg-amber-50 text-amber-700'
    case 'ACCEPTED':
      return 'bg-green-50 text-green-700'
    case 'REVOKED':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-blue-50 text-blue-700'
  }
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

/**
 * @author Gabriel
 * @example
 * <UserManagement />
 */
export default function UserManagement() {
  const { user, token } = useAuth()

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [unitId, setUnitId] = useState('')

  const [editName, setEditName] = useState('')
  const [editUnitId, setEditUnitId] = useState('')

  const loadData = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const [usersData, invitationsData, unitsData] =
        await Promise.all([
          getManagedUsers(token),
          getInvitations(token),
          getUnits(token),
        ])

      setUsers(usersData)
      setInvitations(invitationsData)
      setUnits(unitsData)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível carregar os usuários.',
      )
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function openCreate() {
    setName('')
    setEmail('')
    setUnitId(units[0]?.id || '')
    setError('')
    setNotice('')
    setShowCreate(true)
  }

  function openEdit(managedUser: ManagedUser) {
    setEditingUser(managedUser)
    setEditName(managedUser.name)
    setEditUnitId(managedUser.units[0]?.id || '')
    setError('')
    setNotice('')
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token || saving) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const result = await createInvitation(token, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        unitId,
      })

      setShowCreate(false)
      setNotice(result.message)
      await loadData()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Erro ao cadastrar convite.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSend(invitation: Invitation) {
    if (!token || busyId) return

    if (
      !window.confirm(
        `Enviar convite para ${invitation.email}?`,
      )
    ) {
      return
    }

    setBusyId(invitation.id)
    setError('')
    setNotice('')

    try {
      const result = await sendInvitation(token, invitation.id)
      setNotice(result.message)
      await loadData()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível enviar o convite.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleRevoke(invitation: Invitation) {
    if (!token || busyId) return

    if (
      !window.confirm(
        `Revogar o convite de ${invitation.email}?`,
      )
    ) {
      return
    }

    setBusyId(invitation.id)
    setError('')
    setNotice('')

    try {
      const result = await revokeInvitation(
        token,
        invitation.id,
      )

      setNotice(result.message)
      await loadData()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Erro ao revogar convite.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token || !editingUser || saving) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const result = await updateManagedUser(
        token,
        editingUser.id,
        {
          name: editName.trim(),
          unitId: editUnitId,
        },
      )

      setEditingUser(null)
      setNotice(result.message)
      await loadData()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Erro ao atualizar gerente.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(managedUser: ManagedUser) {
    if (!token || busyId) return

    const action = managedUser.active ? 'desativar' : 'ativar'

    if (
      !window.confirm(
        `Deseja ${action} o acesso de ${managedUser.name}?`,
      )
    ) {
      return
    }

    setBusyId(managedUser.id)
    setError('')
    setNotice('')

    try {
      const result = await updateManagedUser(
        token,
        managedUser.id,
        { active: !managedUser.active },
      )

      setNotice(result.message)
      await loadData()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Erro ao alterar acesso.',
      )
    } finally {
      setBusyId(null)
    }
  }

  if (user?.role !== 'GENERAL_MANAGER') {
    return null
  }

  const activeManagers = users.filter(
    (item) => item.role === 'UNIT_MANAGER' && item.active,
  ).length

  const pendingInvitations = invitations.filter(
    (item) => item.status === 'DRAFT' || item.status === 'SENT',
  ).length

  return (
    <div className="space-y-6 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Users size={22} className="text-hut-red" />

            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Gestão de usuários
            </h1>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Gerencie gerentes, unidades e convites de acesso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-hut-card px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={15} />
            Atualizar
          </button>

          <button type="button" onClick={openCreate} disabled={!units.length}
            className="flex items-center gap-2 rounded-lg bg-hut-red px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
            <Plus size={16} />
            Convidar gerente
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <Check size={16} />
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Usuários cadastrados',
            value: users.length,
            icon: Users,
          },
          {
            title: 'Gerentes ativos',
            value: activeManagers,
            icon: ShieldCheck,
          },
          {
            title: 'Convites pendentes',
            value: pendingInvitations,
            icon: Mail,
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-hut-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {item.title}
                </p>
                <Icon size={18} className="text-hut-red" />
              </div>

              <p className="mt-3 text-2xl font-semibold text-gray-900">
                {loading ? '—' : item.value}
              </p>
            </div>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-hut-card">
        <div className="border-b border-gray-100 px-5 py-5">
          <h2 className="text-base font-semibold text-gray-900">
            Usuários cadastrados
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Contas que já existem no sistema.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Usuário</th>
                <th className="px-5 py-3 font-medium">Perfil</th>
                <th className="px-5 py-3 font-medium">Unidade</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {users.map((managedUser) => (
                <tr key={managedUser.id} className="text-xs">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-hut-red">
                        <UserRound size={16} />
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900">
                          {managedUser.name}
                        </p>
                        <p className="mt-1 text-gray-500">
                          {managedUser.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {managedUser.role === 'GENERAL_MANAGER'
                      ? 'Gerente geral' : 'Gerente de unidade'}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {managedUser.role === 'GENERAL_MANAGER'
                      ? 'Todas as unidades' : managedUser.units.map((unit) => unit.name).join(', ') || 'Sem unidade'}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                      managedUser.active
                        ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600' }`}>
                      {managedUser.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    {managedUser.role === 'UNIT_MANAGER' && (
                      <div className="flex justify-end gap-2">
                        <button type="button"
                          onClick={() => openEdit(managedUser)}
                          className="rounded-md border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50">
                          Editar
                        </button>

                        <button type="button" disabled={busyId === managedUser.id}
                          onClick={() => void handleToggleActive(managedUser)}
                          className="rounded-md border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                          {managedUser.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && users.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            Nenhum usuário cadastrado.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-hut-card">
        <div className="border-b border-gray-100 px-5 py-5">
          <h2 className="text-base font-semibold text-gray-900">
            Convites
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Acompanhe convites pendentes, enviados e concluídos.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Convidado</th>
                <th className="px-5 py-3 font-medium">Unidade</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Validade</th>
                <th className="px-5 py-3 text-right font-medium">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {invitations.map((invitation) => {
                const pending =
                  invitation.status === 'DRAFT' ||
                  invitation.status === 'SENT'

                const expired =
                  invitation.status === 'SENT' &&
                  Boolean(
                    invitation.expiresAt &&
                    new Date(invitation.expiresAt) <= new Date(),
                  )

                return (
                  <tr key={invitation.id} className="text-xs">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {invitation.name}
                      </p>
                      <p className="mt-1 text-gray-500">
                        {invitation.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {invitation.unit.name}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${getStatusClass(invitation.status)}`}>
                        {expired
                          ? 'Expirado' : statusLabels[invitation.status]}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(invitation.expiresAt)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {pending && (
                        <div className="flex justify-end gap-2">
                          <button type="button" disabled={Boolean(busyId)}
                            onClick={() => void handleSend(invitation)}
                            className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            <Send size={13} />
                            {invitation.status === 'SENT'
                              ? 'Reenviar'
                              : 'Enviar'}
                          </button>

                          <button type="button" disabled={Boolean(busyId)}
                            onClick={() => void handleRevoke(invitation)}
                            className="rounded-md border border-red-100 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50">
                            Revogar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && invitations.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            Nenhum convite criado ainda.
          </p>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="create-title" className="w-full max-w-md rounded-xl bg-hut-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="create-title" className="text-lg font-semibold">
                Convidar gerente
              </h2>

              <button type="button" onClick={() => setShowCreate(false)} aria-label="Fechar" className="text-gray-500">
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Primeiro salvaremos o convite. Depois você poderá enviá-lo por e-mail.
            </p>

            <form onSubmit={(event) => void handleCreate(event)} className="mt-6 space-y-4">
              <label className="block text-xs font-medium text-gray-700">
                Nome completo
                <input type="text" required minLength={3} maxLength={100} value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={`mt-2 ${inputClass}`} />
              </label>

              <label className="block text-xs font-medium text-gray-700">
                E-mail
                <input type="email" required value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`mt-2 ${inputClass}`} />
              </label>

              <label className="block text-xs font-medium text-gray-700">
                Unidade autorizada
                <div className="relative mt-2">
                  <select required value={unitId}
                    onChange={(event) => setUnitId(event.target.value)}
                    className={`${inputClass} appearance-none pr-10`}>
                    <option value="">Selecione uma unidade</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3 text-gray-400" />
                </div>
              </label>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium">
                  Cancelar
                </button>

                <button type="submit" disabled={saving}
                  className="rounded-lg bg-hut-red px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Criar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-title" className="w-full max-w-md rounded-xl bg-hut-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="edit-title" className="text-lg font-semibold">
                Editar gerente
              </h2>

              <button type="button" onClick={() => setEditingUser(null)} aria-label="Fechar" className="text-gray-500">
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              {editingUser.email}
            </p>

            <form onSubmit={(event) => void handleEdit(event)} className="mt-6 space-y-4">
              <label className="block text-xs font-medium text-gray-700">
                Nome completo
                <input required minLength={3} maxLength={100} value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className={`mt-2 ${inputClass}`} />
              </label>

              <label className="block text-xs font-medium text-gray-700">
                Unidade autorizada
                <select required value={editUnitId}
                  onChange={(event) => setEditUnitId(event.target.value)}
                  className={`mt-2 ${inputClass}`}>
                  <option value="">Selecione</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-medium">
                  Cancelar
                </button>

                <button type="submit" disabled={saving || !editUnitId}
                  className="rounded-lg bg-hut-red px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

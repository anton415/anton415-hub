import { Plus, ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
import type { TodoProject } from "../../app/api/types";
import type { ProjectNode } from "./lib/buildTree";
import { allViews, type Scope } from "./lib/constants";

type Props = {
  scope: Scope;
  projectTree: ProjectNode[];
  collapsedProjects: Set<number>;
  onToggleProjectCollapse: (id: number) => void;
  onSelectScope: (scope: Scope) => void;
  onOpenNewProject: () => void;
  onEditProject: (project: TodoProject) => void;
};

function ProjectRow({
  project,
  level,
  isActive,
  isCollapsed,
  onToggleCollapse,
  onSelect,
  onEdit
}: {
  project: ProjectNode;
  level: number;
  isActive: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const hasChildren = project.children.length > 0;
  return (
    <div
      className={`w-full flex items-center justify-between pr-2 py-1 rounded-lg text-sm transition-colors group ${
        isActive ? "bg-accent" : "hover:bg-accent"
      }`}
      style={{ paddingLeft: `${8 + level * 16}px` }}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={
              isCollapsed
                ? `Развернуть проект ${project.name}`
                : `Свернуть проект ${project.name}`
            }
            aria-expanded={!isCollapsed}
            className="hover:bg-accent/50 rounded p-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={onSelect}
          aria-current={isActive ? "page" : undefined}
          className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="size-3 rounded-full bg-chart-1 shrink-0" />
          <span className="truncate">{project.name}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Действия с проектом ${project.name}`}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 hover:bg-accent rounded shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="size-3" />
      </button>
    </div>
  );
}

function renderProject(
  project: ProjectNode,
  level: number,
  props: Props
): React.ReactNode {
  const {
    scope,
    collapsedProjects,
    onToggleProjectCollapse,
    onSelectScope,
    onEditProject
  } = props;
  const isCollapsed = collapsedProjects.has(project.id);
  const isActive = scope.kind === "project" && scope.projectId === project.id;

  return (
    <div key={project.id}>
      <ProjectRow
        project={project}
        level={level}
        isActive={isActive}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => onToggleProjectCollapse(project.id)}
        onSelect={() => onSelectScope({ kind: "project", projectId: project.id })}
        onEdit={() => onEditProject(project)}
      />
      {project.children.length > 0 &&
        !isCollapsed &&
        project.children.map((child) => renderProject(child, level + 1, props))}
    </div>
  );
}

export function TaskSidebar(props: Props) {
  const { scope, projectTree, onSelectScope, onOpenNewProject } = props;
  return (
    <>
      <div className="mb-6">
        <h2 className="text-sm mb-3">Списки</h2>
        <div className="space-y-1">
          {allViews.map((view) => {
            const Icon = view.icon;
            const isActive = scope.kind === "view" && scope.view === view.id;
            return (
              <button
                key={view.id}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-accent" : "hover:bg-accent"
                }`}
                onClick={() => onSelectScope({ kind: "view", view: view.id })}
              >
                <Icon className={`size-4 ${view.color}`} />
                <span>{view.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm mb-3">Проекты</h2>
        <div className="space-y-1">{projectTree.map((p) => renderProject(p, 0, props))}</div>
        <button
          onClick={onOpenNewProject}
          className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          <Plus className="size-4" />
          <span>Новый проект</span>
        </button>
      </div>
    </>
  );
}

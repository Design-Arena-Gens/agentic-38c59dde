import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import { subDays } from "date-fns";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, org, days = 30 } = body;

    if (!token || !org) {
      return NextResponse.json(
        { error: "Token e organização são obrigatórios" },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token });
    const since = subDays(new Date(), days).toISOString();

    // Get all members of the organization
    const { data: members } = await octokit.rest.orgs.listMembers({
      org,
      per_page: 100,
    });

    // Get all repositories
    const { data: repos } = await octokit.rest.repos.listForOrg({
      org,
      per_page: 100,
    });

    const userActivities: Map<string, UserActivity> = new Map();

    // Initialize user activities
    members.forEach((member) => {
      userActivities.set(member.login, {
        username: member.login,
        commits: 0,
        prs: 0,
        reviews: 0,
        issues: 0,
        totalActivity: 0,
        avgCommitsPerDay: 0,
        status: "normal",
      });
    });

    // Fetch activities from each repository
    for (const repo of repos) {
      try {
        // Get commits
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner: org,
          repo: repo.name,
          since,
          per_page: 100,
        });

        commits.forEach((commit) => {
          const author = commit.author?.login;
          if (author && userActivities.has(author)) {
            const activity = userActivities.get(author)!;
            activity.commits++;
            userActivities.set(author, activity);
          }
        });

        // Get pull requests
        const { data: prs } = await octokit.rest.pulls.list({
          owner: org,
          repo: repo.name,
          state: "all",
          per_page: 100,
        });

        prs.forEach((pr) => {
          if (new Date(pr.created_at) >= new Date(since)) {
            const author = pr.user?.login;
            if (author && userActivities.has(author)) {
              const activity = userActivities.get(author)!;
              activity.prs++;
              userActivities.set(author, activity);
            }
          }
        });

        // Get PR reviews
        for (const pr of prs) {
          try {
            const { data: reviews } = await octokit.rest.pulls.listReviews({
              owner: org,
              repo: repo.name,
              pull_number: pr.number,
              per_page: 100,
            });

            reviews.forEach((review) => {
              if (new Date(review.submitted_at!) >= new Date(since)) {
                const reviewer = review.user?.login;
                if (reviewer && userActivities.has(reviewer)) {
                  const activity = userActivities.get(reviewer)!;
                  activity.reviews++;
                  userActivities.set(reviewer, activity);
                }
              }
            });
          } catch (error) {
            // Skip if reviews can't be fetched
            console.error(`Error fetching reviews for PR ${pr.number}:`, error);
          }
        }

        // Get issues
        const { data: issues } = await octokit.rest.issues.listForRepo({
          owner: org,
          repo: repo.name,
          state: "all",
          since,
          per_page: 100,
        });

        issues.forEach((issue) => {
          if (!issue.pull_request) {
            const author = issue.user?.login;
            if (author && userActivities.has(author)) {
              const activity = userActivities.get(author)!;
              activity.issues++;
              userActivities.set(author, activity);
            }
          }
        });
      } catch (error) {
        console.error(`Error fetching data for repo ${repo.name}:`, error);
        // Continue with next repo
      }
    }

    // Calculate total activity and status
    const activities = Array.from(userActivities.values()).map((activity) => {
      activity.totalActivity =
        activity.commits +
        activity.prs * 2 +
        activity.reviews +
        activity.issues;
      activity.avgCommitsPerDay = activity.commits / days;

      // Determine status based on activity
      const avgActivity = activity.totalActivity / days;
      if (avgActivity < 0.5) {
        activity.status = "baixa";
      } else if (avgActivity > 3) {
        activity.status = "alta";
      } else {
        activity.status = "normal";
      }

      return activity;
    });

    // Sort by total activity descending
    activities.sort((a, b) => b.totalActivity - a.totalActivity);

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error("Error fetching GitHub activity:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao buscar atividades do GitHub",
      },
      { status: 500 }
    );
  }
}
